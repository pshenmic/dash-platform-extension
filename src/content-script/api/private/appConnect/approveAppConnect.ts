import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { ApproveAppConnectPayload } from '../../../../types/messages/payloads/ApproveAppConnectPayload'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { AppConnectRepository } from '../../../repository/AppConnectRepository'

export class ApproveAppConnectHandler implements APIHandler {
  appConnectRepository: AppConnectRepository

  constructor (appConnectRepository: AppConnectRepository) {
    this.appConnectRepository = appConnectRepository
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: ApproveAppConnectPayload = event.payload

    await this.appConnectRepository.create(payload.url)

    return {}
  }

  validatePayload (payload: ApproveAppConnectPayload): null | string {
    if (typeof payload?.url !== 'string' || payload.url.length === 0) {
      return 'url is required'
    }

    try {
      const url = new URL(payload.url)

      if (!['http:', 'https:'].includes(url.protocol)) {
        return 'Bad protocol'
      }

      if (payload.url !== url.origin) {
        return 'Bad origin'
      }

      return null
    } catch (error) {
      return 'Invalid URL format'
    }
  }
}
