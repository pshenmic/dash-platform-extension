import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { APIHandler } from '../../APIHandler'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { GetIdentitiesResponse } from '../../../../types/messages/response/GetIdentitiesResponse'

export class GetIdentitiesHandler implements APIHandler {
  identitiesRepository: IdentitiesRepository

  constructor (identitiesRepository: IdentitiesRepository) {
    this.identitiesRepository = identitiesRepository
  }

  async handle (): Promise<GetIdentitiesResponse> {
    const identities = await this.identitiesRepository.getAll()

    return { identities }
  }

  validatePayload (payload: EmptyPayload): null | string {
    return null
  }
}
