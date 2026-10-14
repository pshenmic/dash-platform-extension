import { DashCoreSDK, PrivateKey, Transaction } from 'dash-core-sdk'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { Wallet } from '../../types/Wallet'
import { CoreAddressChain } from '../../types/enums/CoreAddressChain'
import { CoreAddressEntry, deriveCoreAddressesFromXpub, deriveCoreAddressKeyAtIndex } from '../../utils/coreAddresses'
import { buildCoreTransfer, selectCoreUtxos } from '../../utils/coreTransfer'
import { deriveWalletHdKey } from '../../utils'
import { CoreWalletUtxo } from './CoreExplorerService'
import { CoreUtxosService } from './CoreUtxosService'
import { CorePendingSpendsRepository } from '../repository/CorePendingSpendsRepository'

export interface PrepareCoreSpendParams {
  wallet: Wallet
  xpub: string
  toAddress: string
  amountDuffs: bigint
  password: string
  account?: number
  // Spend only this address of the wallet; without it the whole account pays.
  fromAddress?: string
}

// A signed transaction that nothing on the network knows about yet.
export interface PreparedCoreSpend {
  transaction: Transaction
  txid: string
  inputs: CoreWalletUtxo[]
  amountDuffs: bigint
  feeDuffs: bigint
  changeDuffs: bigint
  // null when the leftover was too small to pay for its own output and went to
  // the fee instead.
  changeAddress: string | null
  changeVout: number | null
  fromAddresses: string[]
  // Pending spend entries the explorer has caught up with; the caller may forget
  // them.
  resolvedTxids: string[]
}

/**
 * Paying out of the wallet's own Core (L1) outputs, in two steps: `prepare`
 * selects the inputs and signs, `broadcast` sends the result to the network and
 * records what it spent.
 *
 * The split is what makes a chained operation safe to repeat. An operation that
 * pays an address and then does something with that payment - funding an asset
 * lock, say - knows the txid before anything is on chain, and can write down
 * what it is about to do first. Without that, an interruption between the
 * payment and the next step would leave coins at an address nobody comes back
 * to.
 */
export class CoreSpendService {
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK
  coreUtxos: CoreUtxosService
  corePendingSpendsRepository: CorePendingSpendsRepository

  constructor (sdk: DashPlatformSDK, coreSDK: DashCoreSDK, coreUtxos: CoreUtxosService, corePendingSpendsRepository: CorePendingSpendsRepository) {
    this.sdk = sdk
    this.coreSDK = coreSDK
    this.coreUtxos = coreUtxos
    this.corePendingSpendsRepository = corePendingSpendsRepository
  }

  async prepare (params: PrepareCoreSpendParams): Promise<PreparedCoreSpend> {
    const { wallet, xpub, toAddress, amountDuffs, password, fromAddress } = params
    const account = params.account ?? 0

    const { utxos: spendable, owned, nextUnused, resolvedTxids } = await this.coreUtxos.spendable(
      wallet, xpub, account, fromAddress != null ? [fromAddress] : undefined
    )

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
      selection.inputs, toAddress, amountDuffs, changeEntry.address, selection.change, wallet.network
    )

    // One decryption of the seed for the whole transaction, then one key per
    // input in the order Transaction.sign expects.
    const walletHdKey = deriveWalletHdKey(wallet, password, this.sdk)
    const privateKeys: PrivateKey[] = []

    for (const utxo of selection.inputs) {
      const entry = owned.get(utxo.address) as CoreAddressEntry
      const privateKey = await deriveCoreAddressKeyAtIndex(
        walletHdKey, wallet.network, account, entry.chain, entry.index, this.sdk
      )

      // The xpub the address was listed from and the seed signing for it must
      // agree. If they do not, the signature is invalid and the inputs are spent
      // on a transaction nobody will relay - so refuse before broadcasting.
      if (privateKey.getAddress() !== utxo.address) {
        throw new Error(`Derived key does not match Core address ${utxo.address}: the stored xpub and the wallet seed disagree`)
      }

      privateKeys.push(privateKey)
    }

    transaction.sign(privateKeys)

    return {
      transaction,
      txid: transaction.hash(),
      inputs: selection.inputs,
      amountDuffs,
      feeDuffs: selection.fee,
      changeDuffs: selection.change,
      // buildCoreTransfer puts the change last, so it is the final output
      // whenever there is one at all.
      changeAddress: selection.change > 0n ? changeEntry.address : null,
      changeVout: selection.change > 0n ? transaction.outputs.length - 1 : null,
      fromAddresses: [...new Set(selection.inputs.map(utxo => utxo.address))],
      resolvedTxids
    }
  }

  // Sends a prepared transaction and records what it spent, so the next spend
  // does not offer the same outputs while the explorer catches up.
  async broadcast (prepared: PreparedCoreSpend): Promise<void> {
    await this.coreSDK.broadcastTransaction(prepared.transaction.bytes())

    await this.corePendingSpendsRepository.record({
      txid: prepared.txid,
      spentOutpoints: prepared.inputs.map(utxo => `${utxo.txid}:${utxo.vout}`),
      ...(prepared.changeAddress != null && prepared.changeVout != null
        ? {
            change: {
              txid: prepared.txid,
              vout: prepared.changeVout,
              amount: prepared.changeDuffs.toString(),
              address: prepared.changeAddress
            }
          }
        : {}),
      broadcastedAt: Date.now()
    })
  }
}
