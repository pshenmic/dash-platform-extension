import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { RepositoryScope } from '../../../../types/RepositoryScope'
import { GetIdentityFundingSourcesResponse } from '../../../../types/messages/response/GetIdentityFundingSourcesResponse'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentityFundingService } from '../../../services/IdentityFundingService'
import { validateFundingScope } from './identityFundingPayload'

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error)

// What the wallet can put towards an identity: its Core balance, read by account
// xpub. A balance that cannot be read reports its error instead.
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

    try {
      return { core: { balanceCredits: await this.service.coreBalanceCredits(walletRepository, wallet.network) } }
    } catch (error) {
      return { core: { error: errorMessage(error) } }
    }
  }

  validatePayload (payload: RepositoryScope): string | null {
    return validateFundingScope(payload)
  }
}
