import { StateTransitionsRepository } from '../../../repository/StateTransitionsRepository'
import { GetStateTransitionPayload } from '../../../../types/messages/payloads/GetStateTransitionPayload'
import { EventData } from '../../../../types/EventData'
import { validateHex } from '../../../../utils'
import { APIHandler } from '../../APIHandler'
import { GetStateTransitionResponse } from '../../../../types/messages/response/GetStateTransitionResponse'

export class GetStateTransitionHandler implements APIHandler {
  stateTransitionsRepository: StateTransitionsRepository

  constructor (stateTransitionsRepository: StateTransitionsRepository) {
    this.stateTransitionsRepository = stateTransitionsRepository
  }

  async handle (event: EventData): Promise<GetStateTransitionResponse> {
    const payload: GetStateTransitionPayload = event.payload

    const stateTransition = await this.stateTransitionsRepository.get(payload.hash)

    if (stateTransition == null) {
      throw new Error(`Could not find state transition by hash ${payload.hash}`)
    }

    return { stateTransition }
  }

  validatePayload (payload: GetStateTransitionPayload): null | string {
    if (!validateHex(payload.hash)) {
      return 'State transition hash is not valid'
    }

    return null
  }
}
