import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types'
import { GetAppConnectPayload } from '../../../../types/messages/payloads/GetAppConnectPayload'
import { AppConnectRepository } from '../../../repository/AppConnectRepository'
import { RemoveAppConnectPayload } from '../../../../types/messages/payloads/RemoveAppConnectPayload'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'

export class RemoveAppConnectHandler implements APIHandler {
  appConnectRepository: AppConnectRepository

  constructor (appConnectRepository: AppConnectRepository) {
    this.appConnectRepository = appConnectRepository
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: RemoveAppConnectPayload = event.payload

    await this.appConnectRepository.removeById(payload.id)

    return {}
  }

  validatePayload (payload: GetAppConnectPayload): null | string {
    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
      return 'ID is required'
    }

    return null
  }
}
