import { DashCoreSDK, PrivateKey, Transaction } from 'dash-core-sdk'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { Wallet } from '../../types/Wallet'
import { CoreAddressChain } from '../../types/enums/CoreAddressChain'
import { CoreAddressEntry, deriveCoreAddressesFromXpub, deriveCoreAddressKeyAtIndex } from '../../utils/coreAddresses'
import { buildCoreTransferMulti, CoreTransferOutput, maxCoreSpend, selectCoreUtxos } from '../../utils/coreTransfer'
import { deriveWalletHdKey, hexToBytes } from '../../utils'
import { CoreWalletUtxo } from './CoreExplorerService'
import { CoreUtxosService } from './CoreUtxosService'

export interface CoreOutpoint {
  txid: string
  vout: number
}

export interface PlanCoreSpendParams {
  wallet: Wallet
  xpub: string
  // One output per recipient, in this order; change, when there is any, comes
  // after them.
  outputs: CoreTransferOutput[]
  account?: number
  // Spend only this address of the wallet; without it the whole account pays.
  fromAddress?: string
  // Spend exactly these outputs of the wallet, in this order - coin control.
  // Anything not in the spendable set is refused.
  inputs?: CoreOutpoint[]
  // Where the change goes; must be an address of this wallet. Without it the
  // next free address on the internal chain is used.
  changeAddress?: string
  // Pay out everything the inputs hold, less the fee, to the single output -
  // what a Max button does. The output's own amount is then ignored.
  sendMax?: boolean
}

export interface PrepareCoreSpendParams extends PlanCoreSpendParams {
  password: string
}

// What a spend would cost, worked out without signing anything.
export interface CoreSpendPlan {
  // The outputs as they will be paid: the same ones asked for, except under
  // `sendMax`, where the single amount is the most the inputs can pay.
  outputs: CoreTransferOutput[]
  inputs: CoreWalletUtxo[]
  totalInDuffs: bigint
  amountDuffs: bigint
  feeDuffs: bigint
  changeDuffs: bigint
  changeAddress: string
  // The largest total the inputs this spend could draw on can pay out, across
  // the same number of outputs. What a Max button offers.
  maxSendableDuffs: bigint
  owned: Map<string, CoreAddressEntry>
}

// A signed transaction that nothing on the network knows about yet.
export interface PreparedCoreSpend {
  transaction: Transaction
  txid: string
  // What it pays, as it pays it: under `sendMax` the amount here is the one that
  // was worked out, not the one asked for.
  outputs: CoreTransferOutput[]
  inputs: CoreWalletUtxo[]
  amountDuffs: bigint
  feeDuffs: bigint
  changeDuffs: bigint
  // null when the leftover was too small to pay for its own output and went to
  // the fee instead.
  changeAddress: string | null
  fromAddresses: string[]
}

/**
 * Paying out of the wallet's own Core (L1) outputs, in two steps: `prepare`
 * selects the inputs and signs, `broadcast` sends the result to the network.
 *
 * The split is what makes a chained operation safe to repeat. An operation that
 * pays an address and then does something with that payment - funding an asset
 * lock, say - knows the txid before anything is on chain, and can write down
 * what it is about to do first. Without that, an interruption between the
 * payment and the next step would leave coins at an address nobody comes back
 * to.
 */
// The wallet's own outputs the caller picked, in the order it picked them. An
// outpoint that is not spendable is named rather than silently dropped: the
// caller chose it from a list and has to learn that the list moved on.
const pickOutpoints = (spendable: CoreWalletUtxo[], chosen: CoreOutpoint[]): CoreWalletUtxo[] => {
  const byOutpoint = new Map(spendable.map(utxo => [`${utxo.txid}:${utxo.vout}`, utxo]))

  return chosen.map(outpoint => {
    const utxo = byOutpoint.get(`${outpoint.txid}:${outpoint.vout}`)

    if (utxo == null) {
      throw new Error(`Output ${outpoint.txid}:${outpoint.vout.toString()} is not among this wallet's spendable outputs`)
    }

    return utxo
  })
}

export class CoreSpendService {
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK
  coreUtxos: CoreUtxosService

  constructor (sdk: DashPlatformSDK, coreSDK: DashCoreSDK, coreUtxos: CoreUtxosService) {
    this.sdk = sdk
    this.coreSDK = coreSDK
    this.coreUtxos = coreUtxos
  }

  // Coin selection and fee, with nothing signed and nothing sent. The same
  // numbers `prepare` goes on to use, so an amount estimated here is the amount
  // that gets paid.
  async plan (params: PlanCoreSpendParams): Promise<CoreSpendPlan> {
    const { wallet, xpub, outputs, fromAddress } = params
    const account = params.account ?? 0

    const { utxos, owned, nextUnused } = await this.coreUtxos.spendable(
      wallet, xpub, account, fromAddress != null ? [fromAddress] : undefined
    )

    if (utxos.length === 0) {
      throw new Error(fromAddress != null
        ? `Core address ${fromAddress} has no unspent outputs`
        : 'This wallet has no unspent Core outputs to spend')
    }

    const spendable = params.inputs != null ? pickOutpoints(utxos, params.inputs) : utxos

    // Under sendMax the amount is not the caller's to give: it is whatever the
    // inputs hold once the fee of spending all of them is paid.
    const effectiveOutputs = params.sendMax === true
      ? [{ address: outputs[0].address, amountDuffs: maxCoreSpend(spendable, 1) }]
      : outputs

    const amountDuffs = effectiveOutputs.reduce((sum, output) => sum + output.amountDuffs, 0n)
    const selection = selectCoreUtxos(spendable, amountDuffs, effectiveOutputs.length)

    // Change goes to the next free address on the internal chain unless the
    // caller names one of ours. Two sends in a row can reuse it: the explorer
    // only lists mined outputs, so the first change output is invisible until it
    // is in a block.
    const changeAddress = params.changeAddress ?? deriveCoreAddressesFromXpub(
      this.sdk, xpub, wallet.network, account, CoreAddressChain.change, 1, nextUnused.change
    )[0].address

    if (!owned.has(changeAddress)) {
      throw new Error(`Change address ${changeAddress} is not one of this wallet's own addresses`)
    }

    return {
      outputs: effectiveOutputs,
      inputs: selection.inputs,
      totalInDuffs: selection.totalIn,
      amountDuffs,
      feeDuffs: selection.fee,
      changeDuffs: selection.change,
      changeAddress,
      maxSendableDuffs: maxCoreSpend(spendable, effectiveOutputs.length),
      owned
    }
  }

  async prepare (params: PrepareCoreSpendParams): Promise<PreparedCoreSpend> {
    const { wallet, password } = params

    const plan = await this.plan(params)
    const { inputs, amountDuffs, feeDuffs, changeDuffs, changeAddress, owned } = plan
    const account = params.account ?? 0

    const transaction = buildCoreTransferMulti(
      inputs, plan.outputs, changeAddress, changeDuffs, wallet.network
    )

    // One decryption of the seed for the whole transaction, then one key per
    // input in the order Transaction.sign expects.
    const walletHdKey = deriveWalletHdKey(wallet, password, this.sdk)
    const privateKeys: PrivateKey[] = []

    for (const utxo of inputs) {
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
      outputs: plan.outputs,
      inputs,
      amountDuffs,
      feeDuffs,
      changeDuffs,
      // The change output is built last, so it is the final one whenever there
      // is one at all.
      changeAddress: changeDuffs > 0n ? changeAddress : null,
      fromAddresses: [...new Set(inputs.map(utxo => utxo.address))]
    }
  }

  // Sends a prepared transaction to the network.
  async broadcast (prepared: PreparedCoreSpend): Promise<void> {
    await this.coreSDK.broadcastTransaction(prepared.transaction.bytes())
  }

  // True once the network has the transaction, in a block or in its mempool.
  // A node that cannot answer is not an answer, so a failure reads as unknown
  // and the caller decides what to do about it.
  async isBroadcast (txid: string): Promise<boolean> {
    return await this.coreSDK.getTransaction(txid).then(() => true, () => false)
  }

  // Sends a payment an earlier attempt signed and wrote down. It is the same
  // transaction byte for byte, so the network either takes it or reports it as
  // one it already has, and both mean the money is on its way.
  async rebroadcast (txid: string, txHex: string): Promise<void> {
    try {
      await this.coreSDK.broadcastTransaction(hexToBytes(txHex))
    } catch (e) {
      if (!await this.isBroadcast(txid)) {
        throw e
      }
    }
  }
}
