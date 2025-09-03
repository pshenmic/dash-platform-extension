import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types'
import { AppConnectRepository } from '../../../repository/AppConnectRepository'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { GetAllAppConnectsResponse } from '../../../../types/messages/response/GetAllAppConnectsResponse'

export class GetAllAppConnectsHandler implements APIHandler {
  appConnectRepository: AppConnectRepository

  constructor (appConnectRepository: AppConnectRepository) {
    this.appConnectRepository = appConnectRepository
  }

  async handle (event: EventData): Promise<GetAllAppConnectsResponse> {
    const appConnects = await this.appConnectRepository.getAll()

    return { appConnects }
  }

  validatePayload (payload: EmptyPayload): null | string {
    return null
  }
}
