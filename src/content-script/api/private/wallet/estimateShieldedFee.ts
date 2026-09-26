import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { maxShieldedSpend, selectShieldedNotes, SHIELDED_SPEND_KINDS } from '../../../../utils'
import { ShieldedService } from '../../../services/ShieldedService'
import { EstimateShieldedFeePayload } from '../../../../types/messages/payloads/EstimateShieldedFeePayload'
import { EstimateShieldedFeeResponse } from '../../../../types/messages/response/EstimateShieldedFeeResponse'

// Estimates the fee of a shielded spend before it is sent, together with the
// largest amount one spend can send. The fee depends on how many notes the spend
// uses, and only the wallet's own unspent notes tell that, so this syncs and
// recovers them like the spend does (needs the password) and selects notes the same
// way: an amount estimated here is funded when it is sent.
export class EstimateShieldedFeeHandler implements APIHandler {
  walletRepository: WalletRepository
  shielded: ShieldedService

  constructor (walletRepository: WalletRepository, shielded: ShieldedService) {
    this.walletRepository = walletRepository
    this.shielded = shielded
  }

  async handle (event: EventData): Promise<EstimateShieldedFeeResponse> {
    const payload: EstimateShieldedFeePayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Shielded fee can only be estimated for a seedphrase wallet')
    }

    const account = payload.account ?? 0
    const seed = this.shielded.deriveSeed(wallet, payload.password)

    const { unspent } = await this.shielded.loadUnspentNotes(seed, wallet.network, account, payload.fromAddresses)

    const max = maxShieldedSpend(unspent, payload.kind)

    if (payload.amountCredits == null) {
      return {
        feeCredits: max.feeCredits.toString(),
        notesCount: max.notesCount,
        maxAmountCredits: max.amountCredits.toString()
      }
    }

    const selection = selectShieldedNotes(unspent, BigInt(payload.amountCredits), payload.kind)

    return {
      feeCredits: selection.feeCredits.toString(),
      notesCount: selection.notes.length,
      maxAmountCredits: max.amountCredits.toString()
    }
  }

  validatePayload (payload: EstimateShieldedFeePayload): string | null {
    if (!SHIELDED_SPEND_KINDS.includes(payload.kind)) {
      return `kind must be one of ${SHIELDED_SPEND_KINDS.join(', ')}`
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }
    if (payload.amountCredits != null && (typeof payload.amountCredits !== 'string' || !/^\d+$/.test(payload.amountCredits) || BigInt(payload.amountCredits) <= 0n)) {
      return 'Amount must be a positive integer string of credits'
    }
    if (payload.account != null && (!Number.isInteger(payload.account) || payload.account < 0)) {
      return 'Account must be a non-negative integer'
    }
    if (payload.fromAddresses != null) {
      if (payload.kind !== 'transfer') {
        return 'fromAddresses is only supported for a transfer'
      }
      if (!Array.isArray(payload.fromAddresses) || payload.fromAddresses.length === 0) {
        return 'fromAddresses must be a non-empty array of addresses'
      }
      if (!payload.fromAddresses.every(address => typeof address === 'string' && address.length > 0)) {
        return 'fromAddresses must contain only non-empty address strings'
      }
    }

    return null
  }
}
