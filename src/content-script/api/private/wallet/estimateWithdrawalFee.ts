import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { Wallet } from '../../../../types/Wallet'
import { buildPlatformSourceCandidates, PlatformSourceCandidate } from '../../../../utils'
import { addressWithdrawalFeeCredits, identityWithdrawalFeeCredits, maxWithdrawalCredits } from '../../../../utils/withdrawalFee'
import { EstimateWithdrawalFeePayload } from '../../../../types/messages/payloads/EstimateWithdrawalFeePayload'
import { EstimateWithdrawalFeeResponse } from '../../../../types/messages/response/EstimateWithdrawalFeeResponse'
import { MIN_WITHDRAWAL_CREDITS, WITHDRAWAL_CORE_FEE_PER_BYTE } from '../../../../constants'

// What a withdrawal to Core (L2 → L1) costs, before anything is signed: the fee
// Platform demands, the balance behind it and the amount window it accepts.
// Needs no password - the fee comes from dpp's fee model and the balance is
// public.
//
// Covers the two transparent sources. A shielded withdrawal is priced by
// ESTIMATE_SHIELDED_FEE with kind 'withdrawal', because its fee depends on how
// many notes the spend uses.
export class EstimateWithdrawalFeeHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<EstimateWithdrawalFeeResponse> {
    const payload: EstimateWithdrawalFeePayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const amountCredits = payload.amountCredits != null ? BigInt(payload.amountCredits) : null

    if (payload.source === 'identity') {
      return await this.forIdentity(wallet, payload, amountCredits)
    }

    return await this.forAddress(wallet, payload, amountCredits)
  }

  // The identity pays the fee out of its balance on top of the amount, so the
  // whole amount reaches Core and the balance has to cover both.
  private async forIdentity (wallet: Wallet, payload: EstimateWithdrawalFeePayload, amountCredits: bigint | null): Promise<EstimateWithdrawalFeeResponse> {
    const identityId = payload.identityId ?? wallet.currentIdentity

    if (identityId == null) {
      throw new Error('No identity is chosen to withdraw from')
    }

    const balanceCredits = await this.sdk.identities.getIdentityBalance(identityId)
    // The fee model ignores the amount; passing the one being considered keeps
    // the estimate honest if a later platform version starts to price it.
    const feeCredits = identityWithdrawalFeeCredits(identityId, amountCredits ?? MIN_WITHDRAWAL_CREDITS)

    return {
      source: 'identity',
      identityId,
      fromAddress: null,
      feeCredits: feeCredits.toString(),
      feeTakenFromAmount: false,
      balanceCredits: balanceCredits.toString(),
      minAmountCredits: MIN_WITHDRAWAL_CREDITS.toString(),
      maxAmountCredits: maxWithdrawalCredits(balanceCredits, feeCredits).toString(),
      coreFeePerByte: WITHDRAWAL_CORE_FEE_PER_BYTE,
      netAmountCredits: amountCredits?.toString() ?? null,
      totalCostCredits: amountCredits != null ? (amountCredits + feeCredits).toString() : null
    }
  }

  // An address withdrawal spends the amount as its single input and the fee comes
  // out of that input, so Core receives the amount minus the fee and an amount at
  // or below the fee gets nothing across.
  private async forAddress (wallet: Wallet, payload: EstimateWithdrawalFeePayload, amountCredits: bigint | null): Promise<EstimateWithdrawalFeeResponse> {
    const account = 0
    const xpub = await this.walletRepository.getPlatformAccountXpub(account)

    if (xpub == null) {
      throw new Error('Platform xpub is not initialized')
    }

    const count = await this.walletRepository.getPlatformAddressCount(account)

    if (count === 0) {
      throw new Error('No Platform addresses have been created yet')
    }

    const candidates = await buildPlatformSourceCandidates(this.sdk, xpub, wallet.network, account, count)
    const source = this.selectSource(candidates, payload.fromAddress)

    // One input, and no change output: the transition spends exactly the amount
    // being withdrawn.
    const feeCredits = addressWithdrawalFeeCredits(1, false)
    const balanceCredits = source?.balanceCredits ?? 0n

    return {
      source: 'address',
      identityId: null,
      fromAddress: source?.platformAddress ?? null,
      feeCredits: feeCredits.toString(),
      feeTakenFromAmount: true,
      balanceCredits: balanceCredits.toString(),
      // Below this the fee eats everything and nothing arrives.
      minAmountCredits: (feeCredits + MIN_WITHDRAWAL_CREDITS).toString(),
      maxAmountCredits: maxWithdrawalCredits(balanceCredits, feeCredits).toString(),
      coreFeePerByte: WITHDRAWAL_CORE_FEE_PER_BYTE,
      netAmountCredits: amountCredits != null ? (amountCredits > feeCredits ? (amountCredits - feeCredits).toString() : '0') : null,
      totalCostCredits: amountCredits?.toString() ?? null
    }
  }

  // The address the caller named, or the one that could carry the largest
  // withdrawal - which is what an amount screen opens on.
  private selectSource (candidates: PlatformSourceCandidate[], fromAddress?: string): PlatformSourceCandidate | null {
    if (fromAddress != null && fromAddress.length > 0) {
      const chosen = candidates.find(candidate => candidate.platformAddress === fromAddress)

      if (chosen == null) {
        throw new Error('Source address not found in this wallet')
      }

      return chosen
    }

    if (candidates.length === 0) {
      return null
    }

    return candidates.reduce((best, candidate) => candidate.balanceCredits > best.balanceCredits ? candidate : best)
  }

  validatePayload (payload: EstimateWithdrawalFeePayload): string | null {
    if (payload?.source !== 'identity' && payload?.source !== 'address') {
      return "source must be 'identity' or 'address'"
    }
    if (payload.amountCredits != null && (typeof payload.amountCredits !== 'string' || !/^\d+$/.test(payload.amountCredits))) {
      return 'amountCredits must be a positive integer string of credits'
    }
    if (payload.identityId != null && (typeof payload.identityId !== 'string' || payload.identityId.length === 0)) {
      return 'identityId must be a non-empty string when provided'
    }
    if (payload.fromAddress != null && typeof payload.fromAddress !== 'string') {
      return 'fromAddress must be a string'
    }

    return null
  }
}
