import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { GetAppConnectPayload } from '../../../../types/messages/payloads/GetAppConnectPayload'
import { GetAppConnectResponse } from '../../../../types/messages/response/GetAppConnectResponse'
import { AppConnectRepository } from '../../../repository/AppConnectRepository'

export class GetAppConnectHandler implements APIHandler {
  appConnectRepository: AppConnectRepository

  constructor (appConnectRepository: AppConnectRepository) {
    this.appConnectRepository = appConnectRepository
  }

  async handle (event: EventData): Promise<GetAppConnectResponse> {
    const payload: GetAppConnectPayload = event.payload

    const appConnect = await this.appConnectRepository.getById(payload.id)

    return { appConnect }
  }

  validatePayload (payload: GetAppConnectPayload): null | string {
    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
      return 'ID is required'
    }

    return null
  }
}
