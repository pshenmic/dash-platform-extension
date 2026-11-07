import { base64 } from '@scure/base'
import { PublicAPIContext, PublicAPIHandler } from '../PublicAPIHandler'
import { StateTransitionsRepository } from '../../repository/StateTransitionsRepository'
import { StateTransitionRequests } from '../../services/StateTransitionRequests'
import { EventData } from '../../../types/EventData'
import {
  RequestStateTransitionApprovalResponse
} from '../../../types/messages/response/RequestStateTransitionApprovalResponse'
import {
  RequestStateTransitionApprovalPayload
} from '../../../types/messages/payloads/RequestStateTransitionApprovalPayload'
import { StateTransitionWASM } from 'dash-platform-sdk/types'

export class RequestStateTransitionApprovalHandler implements PublicAPIHandler {
  stateTransitionsRepository: StateTransitionsRepository
  requests: StateTransitionRequests

  constructor (stateTransitionsRepository: StateTransitionsRepository, requests: StateTransitionRequests) {
    this.stateTransitionsRepository = stateTransitionsRepository
    this.requests = requests
  }

  async handle (event: EventData, context: PublicAPIContext): Promise<RequestStateTransitionApprovalResponse> {
    const payload: RequestStateTransitionApprovalPayload = event.payload

    const stateTransitionWASM = StateTransitionWASM.fromBytes(base64.decode(payload.base64))
    // A website may only ask to sign for the identities it was granted, so a
    // connection to one identity cannot spend another's credits. An identity
    // create transition has no owner to check and is not a website's to send.
    const ownerId = stateTransitionWASM.getOwnerId()?.base58()

    if (ownerId == null) {
      throw new Error('State transition has no owner identity to check the connection against')
    }

    if (context.appConnect?.identities.includes(ownerId) !== true) {
      throw new Error(`State transition owner ${ownerId} is not granted to this application`)
    }

    let stateTransition = await this.stateTransitionsRepository.getByHash(stateTransitionWASM.hash(true))

    if (stateTransition == null) {
      stateTransition = await this.stateTransitionsRepository.create(stateTransitionWASM)
    }

    // Followed from here on, so the page is told when the user answers instead
    // of asking again every half second.
    this.requests.track(stateTransition.unsignedHash)

    return {
      stateTransition,
      redirectUrl: `chrome-extension://${chrome.runtime.id}/index.html#/approve/${stateTransition.unsignedHash}`
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
