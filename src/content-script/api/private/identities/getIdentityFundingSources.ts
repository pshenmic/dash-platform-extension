import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { RepositoryScope } from '../../../../types/RepositoryScope'
import { GetIdentityFundingSourcesResponse } from '../../../../types/messages/response/GetIdentityFundingSourcesResponse'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentityFundingService } from '../../../services/IdentityFundingService'
import { validateFundingScope } from './identityFundingPayload'

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error)

// What the wallet can put towards an identity: its Core balance and its Platform
// addresses, both read by account xpub — no password. Each source reports its own
// error, so one unreachable source does not hide the other.
export class GetIdentityFundingSourcesHandler implements APIHandler {
  walletRepository: WalletRepository
  service: IdentityFundingService

  constructor (walletRepository: WalletRepository, service: IdentityFundingService) {
    this.walletRepository = walletRepository
    this.service = service
  }

  async handle (event: EventData): Promise<GetIdentityFundingSourcesResponse> {
    const payload: RepositoryScope = event.payload
    const walletRepository = this.walletRepository.forScope(payload)
    const wallet = await walletRepository.getCurrent()

    if (wallet == null || wallet.type !== 'seedphrase') {
      throw new Error('Native funding requires a seedphrase wallet')
    }

    const { sdk } = this.service.clientsFor(payload)
    const result: GetIdentityFundingSourcesResponse = { core: {}, platform: { addresses: [] } }

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

    await Promise.all([readCore(), readPlatform()])

    return result
  }

  validatePayload (payload: RepositoryScope): string | null {
    return validateFundingScope(payload)
  }
}
