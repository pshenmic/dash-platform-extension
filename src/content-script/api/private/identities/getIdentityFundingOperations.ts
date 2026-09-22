import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { RepositoryScope } from '../../../../types/RepositoryScope'
import { IdentityFundingOperation } from '../../../../types/IdentityFundingOperation'
import { IdentityFundingService } from '../../../services/IdentityFundingService'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { fundingResponse, validateFundingScope } from './identityFundingPayload'

interface LegacyFundingEntry {
  address: string
  purpose: string
  identityId?: string
  assetLockTxid?: string
}

// Lists the wallet's funding operations, and the unfinished legacy deposits made
// to a funding address before native funding, which can still be resumed.
export class GetIdentityFundingOperationsHandler implements APIHandler {
  service: IdentityFundingService

  constructor (service: IdentityFundingService) {
    this.service = service
  }

  async handle (event: EventData): Promise<{ operations: IdentityFundingOperation[], legacy: LegacyFundingEntry[] }> {
    const payload: RepositoryScope = event.payload
    const repository = this.service.repository(payload)
    const legacy = await new AssetLockFundingAddressesRepository(repository.storageAdapter, payload).getAll()

    return {
      operations: (await repository.getAll()).map(fundingResponse),
      legacy: legacy
        .filter(entry => !entry.used)
        .map(entry => ({
          address: entry.address,
          purpose: entry.purpose ?? 'registration',
          identityId: entry.identityId,
          assetLockTxid: entry.assetLockTxid ?? undefined
        }))
    }
  }

  validatePayload (payload: RepositoryScope): string | null {
    return validateFundingScope(payload)
  }
}
