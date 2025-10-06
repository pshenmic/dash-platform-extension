import { StateTransitionWASM } from 'pshenmic-dpp'
import { base64 } from '@scure/base'
import { APIHandler } from '../../APIHandler'
import { StateTransitionsRepository } from '../../../repository/StateTransitionsRepository'
import { EventData } from '../../../../types'
import { CreateStateTransitionResponse } from '../../../../types/messages/response/CreateStateTransitionResponse'
import { CreateStateTransitionPayload } from '../../../../types/messages/payloads/CreateStateTransitionPayload'

export class CreateStateTransitionHandler implements APIHandler {
  stateTransitionsRepository: StateTransitionsRepository

  constructor (stateTransitionsRepository: StateTransitionsRepository) {
    this.stateTransitionsRepository = stateTransitionsRepository
  }

  async handle (event: EventData): Promise<CreateStateTransitionResponse> {
    const payload: CreateStateTransitionPayload = event.payload

    const stateTransitionWASM = StateTransitionWASM.fromBytes(base64.decode(payload.stateTransitionBase64))

    const hash = stateTransitionWASM.hash(true)

    // Check if state transition already exists
    let stateTransition = await this.stateTransitionsRepository.getByHash(hash)

    if (stateTransition == null) {
      // Create new state transition in repository
      stateTransition = await this.stateTransitionsRepository.create(stateTransitionWASM)
    }

    return {
      hash: stateTransition.hash
    }
  }

  validatePayload (payload: CreateStateTransitionPayload): null | string {
    if (typeof payload.stateTransitionBase64 !== 'string') {
      return 'State transition base64 is not string'
    }

    let bytes: Uint8Array | null = null

    try {
      bytes = base64.decode(payload.stateTransitionBase64)
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
