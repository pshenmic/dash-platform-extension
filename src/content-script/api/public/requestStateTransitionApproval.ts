import { base64 } from '@scure/base'
import { MAX_STATE_TRANSITION_SIZE_BASE64 } from '../../../constants'
import { PublicAPIContext, PublicAPIHandler } from '../PublicAPIHandler'
import { StateTransitionsRepository } from '../../repository/StateTransitionsRepository'
import { EventData } from '../../../types/EventData'
import type { StateTransitionInspector } from '../../../types/StateTransitionInspection'
import {
  RequestStateTransitionApprovalResponse
} from '../../../types/messages/response/RequestStateTransitionApprovalResponse'
import {
  RequestStateTransitionApprovalPayload
} from '../../../types/messages/payloads/RequestStateTransitionApprovalPayload'

/**
 * Queues a page-built transition for approval.
 *
 * The page sends the serialized transition; the extension asks the backend to
 * decode it, then decides here whether this website may spend the owner's
 * credits. Keeping the decision in this layer means the public API stays
 * SDK-free while still owning the business rules.
 */
export class RequestStateTransitionApprovalHandler implements PublicAPIHandler {
  stateTransitionsRepository: StateTransitionsRepository
  inspectStateTransition: StateTransitionInspector

  constructor (stateTransitionsRepository: StateTransitionsRepository, inspectStateTransition: StateTransitionInspector) {
    this.stateTransitionsRepository = stateTransitionsRepository
    this.inspectStateTransition = inspectStateTransition
  }

  async handle (event: EventData, context: PublicAPIContext): Promise<RequestStateTransitionApprovalResponse> {
    const payload: RequestStateTransitionApprovalPayload = event.payload

    const { ownerId, unsignedHash, signed } = await this.inspectStateTransition(payload.base64)

    // An identity create transition has no owner to check and is not a
    // website's to send.
    if (ownerId == null) {
      throw new Error('State transition has no owner identity to check the connection against')
    }

    // A website may only ask to sign for the identities it was granted, so a
    // connection to one identity cannot spend another's credits.
    if (context.appConnect?.identities.includes(ownerId) !== true) {
      throw new Error(`State transition owner ${ownerId} is not granted to this application`)
    }

    if (signed) {
      throw new Error('State transition already signed')
    }

    let stateTransition = await this.stateTransitionsRepository.getByHash(unsignedHash)

    if (stateTransition == null) {
      stateTransition = await this.stateTransitionsRepository.createFromEncoded(payload.base64, unsignedHash, context.origin)
    }

    return {
      stateTransition,
      redirectUrl: `chrome-extension://${chrome.runtime.id}/index.html#/approve/${unsignedHash}`
    }
  }

  validatePayload (payload: RequestStateTransitionApprovalPayload): null | string {
    if (typeof payload.base64 !== 'string') {
      return 'State transition base64 is not string'
    }

    // Checked before the decode, which runs on the page's main thread.
    if (payload.base64.length > MAX_STATE_TRANSITION_SIZE_BASE64) {
      return `State transition is too large: ${payload.base64.length} base64 characters, maximum ${MAX_STATE_TRANSITION_SIZE_BASE64}`
    }

    try {
      base64.decode(payload.base64)
    } catch (e) {
      return 'Base64 string is not valid'
    }

    return null
  }
}
