import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { OneTimeAddressesRepository } from '../../../repository/OneTimeAddressesRepository'
import { RequestOneTimeAddressResponse } from '../../../../types/messages/response/RequestOneTimeAddressResponse'

export class RequestOneTimeAddressHandler implements APIHandler {
  oneTimeAddressesRepository: OneTimeAddressesRepository

  constructor (oneTimeAddressesRepository: OneTimeAddressesRepository) {
    this.oneTimeAddressesRepository = oneTimeAddressesRepository
  }

  async handle (_event: EventData): Promise<RequestOneTimeAddressResponse> {
    const { address } = await this.oneTimeAddressesRepository.create()

    return { address }
  }

  validatePayload (_payload: any): null | string {
    return null
  }
}