import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { RejectAppConnectPayload } from '../../../../types/messages/payloads/RejectAppConnectPayload'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { AppConnectRepository } from '../../../repository/AppConnectRepository'
import { AppConnectStatus } from '../../../../types/enums/AppConnectStatus'

export class RejectAppConnectHandler implements APIHandler {
  appConnectRepository: AppConnectRepository

  constructor (appConnectRepository: AppConnectRepository) {
    this.appConnectRepository = appConnectRepository
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: RejectAppConnectPayload = event.payload

    if (await this.appConnectRepository.getById(payload.id) == null) {
      throw new Error('AppConnect not found')
    }

    await this.appConnectRepository.setStatus(payload.id, AppConnectStatus.rejected)

    return {}
  }

  validatePayload (payload: RejectAppConnectPayload): null | string {
    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
      return 'ID is required'
    }

    return null
  }
}
