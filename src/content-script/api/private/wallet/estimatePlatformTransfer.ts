import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { buildPlatformSourceCandidates, platformTransferFeeCredits, PlatformSourceCandidate } from '../../../../utils'
import { EstimatePlatformTransferPayload } from '../../../../types/messages/payloads/EstimatePlatformTransferPayload'
import { EstimatePlatformTransferResponse } from '../../../../types/messages/response/EstimatePlatformTransferResponse'

// What a transfer between Platform addresses costs before it is signed, and the
// most a source can send once that fee is paid. Needs no password: the fee comes
// from dpp's fee model and the balances are public.
//
// The fee grows with every recipient, so the caller says how many it intends to
// pay.
export class EstimatePlatformTransferHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<EstimatePlatformTransferResponse> {
    const payload: EstimatePlatformTransferPayload = event.payload ?? {}
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const account = 0
    const outputCount = payload.outputCount ?? 1
    const feeCredits = platformTransferFeeCredits(outputCount)

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
    const balanceCredits = source?.balanceCredits ?? 0n
    const spendable = balanceCredits - feeCredits

    return {
      fromAddress: source?.platformAddress ?? null,
      feeCredits: feeCredits.toString(),
      balanceCredits: balanceCredits.toString(),
      maxAmountCredits: (spendable > 0n ? spendable : 0n).toString(),
      outputCount
    }
  }

  // The address the caller named, or the one that could send the most - which is
  // what an amount screen opens on.
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

  validatePayload (payload: EstimatePlatformTransferPayload): string | null {
    if (payload?.outputCount != null && (!Number.isInteger(payload.outputCount) || payload.outputCount < 1)) {
      return 'outputCount must be a positive integer'
    }
    if (payload?.fromAddress != null && typeof payload.fromAddress !== 'string') {
      return 'fromAddress must be a string'
    }

    return null
  }
}
