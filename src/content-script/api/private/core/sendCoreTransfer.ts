import { DashCoreSDK, PrivateKey } from 'dash-core-sdk'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { CorePendingSpendsRepository } from '../../../repository/CorePendingSpendsRepository'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { CoreAddressChain } from '../../../../types/enums/CoreAddressChain'
import { CoreAddressEntry, deriveCoreAddressesFromXpub, deriveCoreAddressPrivateKey } from '../../../../utils/coreAddresses'
import { buildCoreTransfer, reconcilePendingSpends, selectCoreUtxos } from '../../../../utils/coreTransfer'
import { deriveWalletHdKey, validateCoreAddress } from '../../../../utils'
import { SendCoreTransferPayload } from '../../../../types/messages/payloads/SendCoreTransferPayload'
import { SendCoreTransferResponse } from '../../../../types/messages/response/SendCoreTransferResponse'

// Sends Core (L1) funds from the wallet's own addresses to a Core address.
// The L1 counterpart of SendPlatformTransfer: reads the wallet's unspent outputs
// from the explorer, picks enough of them to cover amount + fee, derives the key
// of each spent address (needs the password), signs the transaction and
// broadcasts it over DAPI.
//
// Which addresses the wallet owns comes from the explorer's own gap scan of the
// account xpub, so outputs paid to addresses created by another install on the
// same seed are spendable here too.
export class SendCoreTransferHandler implements APIHandler {
  walletRepository: WalletRepository
  corePendingSpendsRepository: CorePendingSpendsRepository
  coreExplorer: CoreExplorerService
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK

  constructor (walletRepository: WalletRepository, corePendingSpendsRepository: CorePendingSpendsRepository, coreExplorer: CoreExplorerService, sdk: DashPlatformSDK, coreSDK: DashCoreSDK) {
    this.walletRepository = walletRepository
    this.corePendingSpendsRepository = corePendingSpendsRepository
    this.coreExplorer = coreExplorer
    this.sdk = sdk
    this.coreSDK = coreSDK
  }

  async handle (event: EventData): Promise<SendCoreTransferResponse> {
    const payload: SendCoreTransferPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Core transfer is only supported for a seedphrase wallet')
    }
    if (!validateCoreAddress(payload.toAddress, wallet.network)) {
      throw new Error(`Invalid recipient Core address for ${wallet.network}`)
    }

    const account = 0
    const amountDuffs = BigInt(payload.amountDuffs)

    const xpub = await this.walletRepository.getCoreAccountXpub(account)

    if (xpub == null) {
      // The xpub is cached only by CreateWallet, and nothing backfills it, so a
      // wallet made before Core support has none and cannot spend on L1.
      throw new Error('Core xpub is not initialized. Call INIT_CORE_XPUB with the wallet password first')
    }

    const { nextUnused } = await this.coreExplorer.getXpubSummary(xpub, wallet.network as NetworkType)

    // Every address the explorer has seen on either chain, plus the next free
    // one — the same extent ListCoreAddresses reports, so what the user sees as
    // their addresses is exactly what can be spent from here.
    const owned = new Map<string, CoreAddressEntry>()

    for (const chain of [CoreAddressChain.receiving, CoreAddressChain.change]) {
      const entries = deriveCoreAddressesFromXpub(
        this.sdk, xpub, wallet.network, account, chain, nextUnused[chain] + 1
      )

      for (const entry of entries) {
        owned.set(entry.address, entry)
      }
    }

    const fromAddress = payload.fromAddress != null && payload.fromAddress.length > 0 ? payload.fromAddress : undefined

    if (fromAddress != null && !owned.has(fromAddress)) {
      throw new Error('Source address not found in this wallet')
    }

    const sourceAddresses = fromAddress != null ? [fromAddress] : [...owned.keys()]
    const utxos = await this.coreExplorer.getAddressesUtxos(sourceAddresses, wallet.network as NetworkType)

    // The explorer only sees mined transactions, so a send made minutes ago is
    // missing from its view: it still offers the inputs that send consumed, and
    // hides the change it produced. Correct both from what we recorded locally,
    // otherwise two sends in a row pick the same inputs and the second is
    // rejected as a double spend.
    const pending = await this.corePendingSpendsRepository.getAll()
    const { candidates, resolvedTxids } = reconcilePendingSpends(utxos, pending, Date.now())

    await this.corePendingSpendsRepository.remove(resolvedTxids)

    // An entry the explorer could not attribute to one of the addresses we asked
    // about has no key to sign it, and must not reach coin selection.
    const sourceSet = new Set(sourceAddresses)
    const spendable = candidates.filter(utxo => sourceSet.has(utxo.address))

    if (spendable.length === 0) {
      throw new Error(fromAddress != null
        ? `Core address ${fromAddress} has no unspent outputs`
        : 'This wallet has no unspent Core outputs to spend')
    }

    const selection = selectCoreUtxos(spendable, amountDuffs)

    // Change goes to the next free address on the internal chain. Two sends in a
    // row can reuse it: the explorer only lists mined outputs, so the first
    // change output is invisible until it is in a block.
    const [changeEntry] = deriveCoreAddressesFromXpub(
      this.sdk, xpub, wallet.network, account, CoreAddressChain.change, 1, nextUnused.change
    )

    const transaction = buildCoreTransfer(
      selection.inputs, payload.toAddress, amountDuffs, changeEntry.address, selection.change, wallet.network
    )

    // One decryption of the seed for the whole transaction, then one key per
    // input in the order Transaction.sign expects.
    const walletHdKey = deriveWalletHdKey(wallet, payload.password, this.sdk)
    const privateKeys: PrivateKey[] = []

    for (const utxo of selection.inputs) {
      const entry = owned.get(utxo.address) as CoreAddressEntry
      const privateKey = await deriveCoreAddressPrivateKey(
        walletHdKey, wallet.network, account, entry.chain, entry.index, this.sdk
      )

      // The xpub the address was listed from and the seed signing for it must
      // agree. If they do not, the signature is invalid and the inputs are spent
      // on a transaction nobody will relay — so refuse before broadcasting.
      if (privateKey.getAddress() !== utxo.address) {
        throw new Error(`Derived key does not match Core address ${utxo.address}: the stored xpub and the wallet seed disagree`)
      }

      privateKeys.push(privateKey)
    }

    transaction.sign(privateKeys)

    const txid = transaction.hash()

    await this.coreSDK.broadcastTransaction(transaction.bytes())

    // buildCoreTransfer puts the change last, so it is the final output whenever
    // there is one at all.
    await this.corePendingSpendsRepository.record({
      txid,
      spentOutpoints: selection.inputs.map(utxo => `${utxo.txid}:${utxo.vout}`),
      ...(selection.change > 0n
        ? {
            change: {
              txid,
              vout: transaction.outputs.length - 1,
              amount: selection.change.toString(),
              address: changeEntry.address
            }
          }
        : {}),
      broadcastedAt: Date.now()
    })

    return {
      txid,
      amountDuffs: amountDuffs.toString(),
      feeDuffs: selection.fee.toString(),
      changeDuffs: selection.change.toString(),
      toAddress: payload.toAddress,
      changeAddress: selection.change > 0n ? changeEntry.address : null,
      fromAddresses: [...new Set(selection.inputs.map(utxo => utxo.address))]
    }
  }

  validatePayload (payload: SendCoreTransferPayload): string | null {
    if (typeof payload.toAddress !== 'string' || payload.toAddress.length === 0) {
      return 'Recipient address must be provided'
    }
    if (typeof payload.amountDuffs !== 'string' || !/^\d+$/.test(payload.amountDuffs) || BigInt(payload.amountDuffs) <= 0n) {
      return 'Amount must be a positive integer string of duffs'
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }
    if (payload.fromAddress != null && typeof payload.fromAddress !== 'string') {
      return 'fromAddress must be a string'
    }

    return null
  }
}
