import { DashCoreSDK, PrivateKey } from 'dash-core-sdk'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { CoreAddressChain } from '../../../../types/enums/CoreAddressChain'
import { CoreAddressEntry, deriveCoreAddressesFromXpub, deriveCoreAddressPrivateKey } from '../../../../utils/coreAddresses'
import { buildCoreTransfer, CoreTransferOutput, selectCoreUtxos } from '../../../../utils/coreTransfer'
import { deriveWalletHdKey, validateCoreAddress } from '../../../../utils'
import { CORE_DUST_THRESHOLD, MAX_CORE_OUTPUTS } from '../../../../constants'
import { SendCoreTransactionPayload } from '../../../../types/messages/payloads/SendCoreTransactionPayload'
import { SendCoreTransactionResponse } from '../../../../types/messages/response/SendCoreTransactionResponse'

// Sends Core (L1) funds from the wallet's own addresses to one or more Core
// addresses. The L1 counterpart of SendPlatformTransaction: reads the wallet's
// unspent outputs from the explorer, picks enough of them to cover the
// recipients plus the fee, derives the key of each spent address (needs the
// password), signs the transaction and broadcasts it over DAPI.
//
// One recipient is the common case and needs no separate method: it is this one
// with a single output.
//
// Which addresses the wallet owns comes from the explorer's own gap scan of the
// account xpub, so outputs paid to addresses created by another install on the
// same seed are spendable here too.
export class SendCoreTransactionHandler implements APIHandler {
  walletRepository: WalletRepository
  coreExplorer: CoreExplorerService
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK

  constructor (walletRepository: WalletRepository, coreExplorer: CoreExplorerService, sdk: DashPlatformSDK, coreSDK: DashCoreSDK) {
    this.walletRepository = walletRepository
    this.coreExplorer = coreExplorer
    this.sdk = sdk
    this.coreSDK = coreSDK
  }

  async handle (event: EventData): Promise<SendCoreTransactionResponse> {
    const payload: SendCoreTransactionPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Core transfer is only supported for a seedphrase wallet')
    }

    const recipients: CoreTransferOutput[] = payload.outputs.map(output => ({
      address: output.address,
      amountDuffs: BigInt(output.amountDuffs)
    }))

    for (const recipient of recipients) {
      if (!validateCoreAddress(recipient.address, wallet.network)) {
        throw new Error(`Invalid recipient Core address for ${wallet.network}: ${recipient.address}`)
      }
    }

    const account = 0
    // What the recipients get between them. The change is worked out on top of
    // this, so it is not part of the amount the caller asked to pay out.
    const amountDuffs = recipients.reduce((sum, recipient) => sum + recipient.amountDuffs, 0n)

    const xpub = await this.walletRepository.getCoreAccountXpub(account)

    if (xpub == null) {
      // Written at wallet creation, or by INIT_ACCOUNT_XPUBS on unlock for a
      // wallet made before Core support. Reaching here means neither has run.
      throw new Error('Core xpub is not initialized. Call INIT_ACCOUNT_XPUBS with the wallet password after unlocking')
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
    // The explorer indexes a transaction as soon as it reaches the mempool, so a
    // send made a moment ago is already reflected here: the inputs it spent are
    // gone and the change it paid is listed.
    const utxos = await this.coreExplorer.getAddressesUtxos(sourceAddresses, wallet.network as NetworkType)

    // An entry the explorer could not attribute to one of the addresses we asked
    // about has no key to sign it, and must not reach coin selection.
    const sourceSet = new Set(sourceAddresses)
    const spendable = utxos.filter(utxo => sourceSet.has(utxo.address))

    if (spendable.length === 0) {
      throw new Error(fromAddress != null
        ? `Core address ${fromAddress} has no unspent outputs`
        : 'This wallet has no unspent Core outputs to spend')
    }

    const selection = selectCoreUtxos(spendable, amountDuffs, recipients.length)

    // Change goes to the next free address on the internal chain. Two sends in a
    // row can reuse it: the explorer only lists mined outputs, so the first
    // change output is invisible until it is in a block.
    const [changeEntry] = deriveCoreAddressesFromXpub(
      this.sdk, xpub, wallet.network, account, CoreAddressChain.change, 1, nextUnused.change
    )

    const transaction = buildCoreTransfer(
      selection.inputs, recipients, changeEntry.address, selection.change, wallet.network
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

    return {
      txid,
      amountDuffs: amountDuffs.toString(),
      feeDuffs: selection.fee.toString(),
      changeDuffs: selection.change.toString(),
      outputs: recipients.map(recipient => ({
        address: recipient.address,
        amountDuffs: recipient.amountDuffs.toString()
      })),
      changeAddress: selection.change > 0n ? changeEntry.address : null,
      fromAddresses: [...new Set(selection.inputs.map(utxo => utxo.address))]
    }
  }

  validatePayload (payload: SendCoreTransactionPayload): string | null {
    if (!Array.isArray(payload.outputs) || payload.outputs.length === 0) {
      return 'outputs must be a non-empty array'
    }
    if (payload.outputs.length > MAX_CORE_OUTPUTS) {
      return `A transaction pays at most ${MAX_CORE_OUTPUTS} recipients, ${payload.outputs.length} given`
    }

    for (const output of payload.outputs) {
      if (typeof output?.address !== 'string' || output.address.length === 0) {
        return 'Every output must name an address'
      }
      if (typeof output?.amountDuffs !== 'string' || !/^\d+$/.test(output.amountDuffs)) {
        return 'Every output amount must be an integer string of duffs'
      }
      // An output at or below the dust threshold is one no node would relay, so
      // it is refused here rather than spending the inputs on a dead
      // transaction.
      if (BigInt(output.amountDuffs) <= CORE_DUST_THRESHOLD) {
        return `Every output must be greater than ${CORE_DUST_THRESHOLD.toString()} duffs`
      }
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
