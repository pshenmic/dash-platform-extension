import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { ApproveAppConnectPayload } from '../../../../types/messages/payloads/ApproveAppConnectPayload'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { AppConnectRepository } from '../../../repository/AppConnectRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { AppConnectStatus } from '../../../../types/enums/AppConnectStatus'

export class ApproveAppConnectHandler implements APIHandler {
  appConnectRepository: AppConnectRepository
  identitiesRepository: IdentitiesRepository

  constructor (appConnectRepository: AppConnectRepository, identitiesRepository: IdentitiesRepository) {
    this.appConnectRepository = appConnectRepository
    this.identitiesRepository = identitiesRepository
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: ApproveAppConnectPayload = event.payload

    const appConnect = await this.appConnectRepository.getById(payload.id)

    if (appConnect == null) {
      throw new Error('AppConnect not found')
    }

    const owned = (await this.identitiesRepository.getAll()).map(identity => identity.identifier)

    // Approving without naming identities grants the wallet's current ones,
    // which is what the approval screen means until it offers a choice.
    const granted = payload.identities ?? owned

    for (const identifier of granted) {
      if (!owned.includes(identifier)) {
        throw new Error(`Identity ${identifier} does not belong to this wallet`)
      }
    }

    await this.appConnectRepository.setIdentities(payload.id, granted)
    await this.appConnectRepository.setStatus(payload.id, AppConnectStatus.approved)

    return {}
  }

  validatePayload (payload: ApproveAppConnectPayload): null | string {
    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
      return 'ID is required'
    }

    if (payload.identities != null && !Array.isArray(payload.identities)) {
      return 'identities must be an array of identifiers when provided'
    }

    if (payload.identities?.some(identifier => typeof identifier !== 'string' || identifier.length === 0) === true) {
      return 'identities must be non-empty strings'
    }

    return null
  }
}
