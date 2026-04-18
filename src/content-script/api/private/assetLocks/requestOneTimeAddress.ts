import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { OneTimeAddressesRepository } from '../../../repository/OneTimeAddressesRepository'
import { RequestOneTimeAddressResponse } from '../../../../types/messages/response/RequestOneTimeAddressResponse'
import { RequestOneTimeAddressPayload } from '../../../../types/messages/payloads/RequestOneTimeAddressPayload'

export class RequestOneTimeAddressHandler implements APIHandler {
  oneTimeAddressesRepository: OneTimeAddressesRepository

  constructor (oneTimeAddressesRepository: OneTimeAddressesRepository) {
    this.oneTimeAddressesRepository = oneTimeAddressesRepository
  }

  async handle (event: EventData): Promise<RequestOneTimeAddressResponse> {
    const payload = (event.payload ?? {}) as RequestOneTimeAddressPayload
    const { address } = await this.oneTimeAddressesRepository.create(payload.password)

    return { address }
  }

  validatePayload (payload: RequestOneTimeAddressPayload): null | string {
    if (payload?.password != null && typeof payload.password !== 'string') {
      return 'password must be a string'
    }

    return null
  }
}
