import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { GetIdentityFundingSourcesPayload } from '../../../../types/messages/payloads/GetIdentityFundingSourcesPayload'
import { GetIdentityFundingSourcesResponse } from '../../../../types/messages/response/GetIdentityFundingSourcesResponse'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentityFundingService } from '../../../services/IdentityFundingService'
import { validateFundingScope, SHIELDED_TOP_UP_UNAVAILABLE } from './identityFundingPayload'

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error)

// What the wallet can put towards an identity: its Core balance, its Platform
// addresses and what the shielded pool allows. Core and Platform are read by
// account xpub, so they need no password; the shielded balance is included only
// when one is given, because the notes are recovered with the viewing key. Each
// source reports its own error, so one unreachable source does not hide the rest.
export class GetIdentityFundingSourcesHandler implements APIHandler {
  walletRepository: WalletRepository
  service: IdentityFundingService

  constructor (walletRepository: WalletRepository, service: IdentityFundingService) {
    this.walletRepository = walletRepository
    this.service = service
  }

  async handle (event: EventData): Promise<GetIdentityFundingSourcesResponse> {
    const payload: GetIdentityFundingSourcesPayload = event.payload
    const walletRepository = this.walletRepository.forScope(payload)
    const wallet = await walletRepository.getCurrent()

    if (wallet == null || wallet.type !== 'seedphrase') {
      throw new Error('Native funding requires a seedphrase wallet')
    }

    const { sdk } = this.service.clientsFor(payload)
    const result: GetIdentityFundingSourcesResponse = {
      core: {},
      platform: { addresses: [] },
      shielded: { denominations: [], topUpError: SHIELDED_TOP_UP_UNAVAILABLE }
    }

    const readCore = async (): Promise<void> => {
      try {
        result.core.balanceCredits = await this.service.coreBalanceCredits(walletRepository, wallet.network)
      } catch (error) {
        result.core.error = errorMessage(error)
      }
    }

    const readPlatform = async (): Promise<void> => {
      try {
        const candidates = await this.service.platformCandidates(walletRepository, wallet.network, sdk)

        result.platform.addresses = candidates.map(candidate => ({
          address: candidate.platformAddress,
          balanceCredits: candidate.balanceCredits.toString()
        }))
      } catch (error) {
        result.platform.error = errorMessage(error)
      }
    }

    const readShielded = async (): Promise<void> => {
      try {
        const protocolVersion = await this.service.shieldedProtocolVersion(sdk)

        result.shielded.protocolVersion = protocolVersion
        result.shielded.denominations = this.service.shieldedDenominations(protocolVersion)

        if (result.shielded.denominations.length === 0) {
          result.shielded.error = `Shielded registration is unsupported on protocol ${protocolVersion ?? 'unknown'} by this SDK`
        }

        if (payload.password != null && payload.password.length > 0) {
          result.shielded.balanceCredits = await this.service.shieldedBalanceCredits(wallet, payload.password, sdk)
        }
      } catch (error) {
        result.shielded.error = errorMessage(error)
      }
    }

    await Promise.all([readCore(), readPlatform(), readShielded()])

    return result
  }

  validatePayload (payload: GetIdentityFundingSourcesPayload): string | null {
    const scopeError = validateFundingScope(payload)

    if (scopeError != null) {
      return scopeError
    }

    if (payload.password != null && typeof payload.password !== 'string') {
      return 'Invalid password'
    }

    return null
  }
}
