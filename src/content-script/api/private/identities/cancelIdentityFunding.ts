import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { RepositoryScope } from '../../../../types/RepositoryScope'
import { IdentityFundingService } from '../../../services/IdentityFundingService'
import { validateFundingScope } from './identityFundingPayload'

type CancelIdentityFundingPayload = RepositoryScope & { operationId: string }

// Cancels a quote that was never sent, releasing its funds. Its reserved key and
// change indexes are not reused: they only ever move forward.
export class CancelIdentityFundingHandler implements APIHandler {
  service: IdentityFundingService

  constructor (service: IdentityFundingService) {
    this.service = service
  }

  async handle (event: EventData): Promise<{ cancelled: boolean }> {
    const payload: CancelIdentityFundingPayload = event.payload
    const repository = this.service.repository(payload)

    await repository.withLock(async () => {
      const operation = await repository.get(payload.operationId)

      if (operation == null || operation.status !== 'prepared') {
        throw new Error('Only an unsubmitted quote can be cancelled')
      }

      await repository.save({ ...operation, status: 'cancelled' })
    })

    return { cancelled: true }
  }

  validatePayload (payload: CancelIdentityFundingPayload): string | null {
    const scopeError = validateFundingScope(payload)

    if (scopeError != null) {
      return scopeError
    }
    if (typeof payload.operationId !== 'string') {
      return 'Operation id must be provided'
    }

    return null
  }
}
