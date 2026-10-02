import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { SetAppConnectIdentitiesPayload } from '../../../../types/messages/payloads/SetAppConnectIdentitiesPayload'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { AppConnectRepository } from '../../../repository/AppConnectRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'

// Changes what an already connected website may see, from the connected sites
// screen. An empty list leaves the connection in place with nothing to read.
export class SetAppConnectIdentitiesHandler implements APIHandler {
  appConnectRepository: AppConnectRepository
  identitiesRepository: IdentitiesRepository

  constructor (appConnectRepository: AppConnectRepository, identitiesRepository: IdentitiesRepository) {
    this.appConnectRepository = appConnectRepository
    this.identitiesRepository = identitiesRepository
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: SetAppConnectIdentitiesPayload = event.payload

    if (await this.appConnectRepository.getById(payload.id) == null) {
      throw new Error('AppConnect not found')
    }

    const owned = (await this.identitiesRepository.getAll()).map(identity => identity.identifier)

    for (const identifier of payload.identities) {
      if (!owned.includes(identifier)) {
        throw new Error(`Identity ${identifier} does not belong to this wallet`)
      }
    }

    await this.appConnectRepository.setIdentities(payload.id, payload.identities)

    return {}
  }

  validatePayload (payload: SetAppConnectIdentitiesPayload): null | string {
    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
      return 'ID is required'
    }

    if (!Array.isArray(payload.identities)) {
      return 'identities must be an array of identifiers'
    }

    if (payload.identities.some(identifier => typeof identifier !== 'string' || identifier.length === 0)) {
      return 'identities must be non-empty strings'
    }

    return null
  }
}
