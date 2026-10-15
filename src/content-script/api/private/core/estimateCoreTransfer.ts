import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreSpendService } from '../../../services/CoreSpendService'
import { EventData } from '../../../../types/EventData'
import { EstimateCoreTransferPayload } from '../../../../types/messages/payloads/EstimateCoreTransferPayload'
import { EstimateCoreTransferResponse } from '../../../../types/messages/response/EstimateCoreTransferResponse'
import { validateCoreAddress } from '../../../../utils'
import { CORE_DUST_THRESHOLD, MAX_CORE_OUTPUTS, MIN_FEE_RELAY } from '../../../../constants'

// What a Core (L1) payment would cost, before anything is signed or sent: the
// inputs it would spend, its fee, its change and the most these inputs can pay
// out. Needs no password.
//
// It runs the same coin selection the send runs, over the same unspent set
// LIST_CORE_UTXOS reports, so an amount estimated here is funded when it is
// sent.
export class EstimateCoreTransferHandler implements APIHandler {
  walletRepository: WalletRepository
  coreSpend: CoreSpendService

  constructor (walletRepository: WalletRepository, coreSpend: CoreSpendService) {
    this.walletRepository = walletRepository
    this.coreSpend = coreSpend
  }

  async handle (event: EventData): Promise<EstimateCoreTransferResponse> {
    const payload: EstimateCoreTransferPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    for (const output of payload.outputs) {
      if (!validateCoreAddress(output.address, wallet.network)) {
        throw new Error(`Invalid recipient Core address for ${wallet.network}: ${output.address}`)
      }
    }

    const account = 0
    const xpub = await this.walletRepository.getCoreAccountXpub(account)

    if (xpub == null) {
      throw new Error('Core xpub is not initialized. Call INIT_ACCOUNT_XPUBS with the wallet password after unlocking')
    }

    const plan = await this.coreSpend.plan({
      wallet,
      xpub,
      account,
      outputs: payload.outputs.map(output => ({ address: output.address, amountDuffs: BigInt(output.amountDuffs) })),
      fromAddress: payload.fromAddress != null && payload.fromAddress.length > 0 ? payload.fromAddress : undefined,
      inputs: payload.inputs,
      changeAddress: payload.changeAddress,
      sendMax: payload.sendMax
    })

    // The asset lock that would spend this deposit pays its own fee out of it,
    // so it is reported but not added to the cost: what leaves the wallet is
    // the deposit plus the fee of the payment that creates it. What arrives on
    // the other side is the deposit minus this.
    const assetLockFeeDuffs = payload.type === 'assetLock' ? MIN_FEE_RELAY : 0n

    return {
      amountDuffs: plan.amountDuffs.toString(),
      feeDuffs: plan.feeDuffs.toString(),
      assetLockFeeDuffs: assetLockFeeDuffs.toString(),
      totalCostDuffs: (plan.amountDuffs + plan.feeDuffs).toString(),
      changeDuffs: plan.changeDuffs.toString(),
      changeAddress: plan.changeAddress,
      inputs: plan.inputs.map(utxo => ({
        txid: utxo.txid,
        vout: utxo.vout,
        address: utxo.address,
        amount: utxo.amount.toString()
      })),
      totalInDuffs: plan.totalInDuffs.toString(),
      maxSendableDuffs: plan.maxSendableDuffs.toString()
    }
  }

  validatePayload (payload: EstimateCoreTransferPayload): string | null {
    return validateCoreOutputsPayload(payload)
  }
}

// Shared with SEND_CORE_TRANSACTION: the same outputs, inputs and change address
// are accepted by both, and a payment must not be refused by one and taken by
// the other.
export const validateCoreOutputsPayload = (payload: {
  outputs?: unknown
  inputs?: unknown
  changeAddress?: unknown
  sendMax?: unknown
}): string | null => {
  if (!Array.isArray(payload?.outputs) || payload.outputs.length === 0) {
    return 'outputs must be a non-empty array'
  }
  if (payload.outputs.length > MAX_CORE_OUTPUTS) {
    return `A transaction pays at most ${MAX_CORE_OUTPUTS} recipients, ${payload.outputs.length} given`
  }
  if (payload.sendMax === true && payload.outputs.length !== 1) {
    return 'sendMax requires exactly one output'
  }

  for (const output of payload.outputs) {
    if (typeof output?.address !== 'string' || output.address.length === 0) {
      return 'Every output must name an address'
    }
    if (typeof output?.amountDuffs !== 'string' || !/^\d+$/.test(output.amountDuffs)) {
      return 'Every output amount must be an integer string of duffs'
    }
    // Under sendMax the amount is worked out rather than given, so whatever
    // stands in for it is not held against the caller.
    if (payload.sendMax !== true && BigInt(output.amountDuffs) <= CORE_DUST_THRESHOLD) {
      return `Every output must be greater than ${CORE_DUST_THRESHOLD.toString()} duffs`
    }
  }

  if (payload.inputs != null) {
    if (!Array.isArray(payload.inputs) || payload.inputs.length === 0) {
      return 'inputs must be a non-empty array when provided'
    }

    for (const input of payload.inputs) {
      if (typeof input?.txid !== 'string' || input.txid.length === 0 || !Number.isInteger(input?.vout) || input.vout < 0) {
        return 'Every input must name a txid and a non-negative vout'
      }
    }
  }

  if (payload.changeAddress != null && (typeof payload.changeAddress !== 'string' || payload.changeAddress.length === 0)) {
    return 'changeAddress must be a non-empty string when provided'
  }

  return null
}
