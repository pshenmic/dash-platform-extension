import { StateTransitionWASM } from 'dash-platform-sdk/types'
import { StateTransitionsRepository } from '../../../repository/StateTransitionsRepository'
import { APIHandler } from '../../APIHandler'
import { RequestStateTransitionApprovalPayload } from '../../../../types/messages/payloads/RequestStateTransitionApprovalPayload'
import { base64 } from '@scure/base'
import { CreateStateTransitionResponse } from '../../../../types/messages/response/CreateStateTransitionResponse'
import { EventData } from '../../../../types'

export class CreateStateTransitionHandler implements APIHandler {
  stateTransitionsRepository: StateTransitionsRepository

  constructor (stateTransitionsRepository: StateTransitionsRepository) {
    this.stateTransitionsRepository = stateTransitionsRepository
  }

  async handle (event: EventData): Promise<CreateStateTransitionResponse> {
    const payload: RequestStateTransitionApprovalPayload = event.payload

    const stateTransitionWASM = StateTransitionWASM.fromBytes(base64.decode(payload.base64))

    let stateTransition = await this.stateTransitionsRepository.getByHash(stateTransitionWASM.hash(true))

    if (stateTransition == null) {
      stateTransition = await this.stateTransitionsRepository.create(stateTransitionWASM)
    }

    return {
      stateTransition
    }
  }

  validatePayload (payload: RequestStateTransitionApprovalPayload): null | string {
    if (typeof payload.base64 !== 'string') {
      return 'State transition base64 is not string'
    }

    let bytes: Uint8Array | null = null

    try {
      bytes = base64.decode(payload.base64)
    } catch (e) {
      return 'Base64 string is not valid'
    }

    try {
      StateTransitionWASM.fromBytes(bytes)
    } catch (e) {
      return 'Failed to deserialize state transition from base64'
    }

    return null
  }
}
