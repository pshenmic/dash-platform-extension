import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { Identity } from '../../../../types/Identity'
import { GetAvailableIdentitiesResponse } from '../../../../types/messages/response/GetAvailableIdentitiesResponse'
import { APIHandler } from '../../APIHandler'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'

export class GetAvailableIdentitiesHandler implements APIHandler {
  identitiesRepository: IdentitiesRepository

  constructor (identitiesRepository: IdentitiesRepository) {
    this.identitiesRepository = identitiesRepository
  }

  async handle (): Promise<GetAvailableIdentitiesResponse> {
    const identities = await this.identitiesRepository.getAll()

    return { identities: identities.map((identity: Identity) => identity.identifier) }
  }

  validatePayload (payload: EmptyPayload): null | string {
    return null
  }
}
