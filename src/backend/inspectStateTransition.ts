import { base64 } from '@scure/base'
import { StateTransitionWASM } from 'dash-platform-sdk/types'
import { MAX_STATE_TRANSITION_SIZE_BASE64 } from '../constants'
import type { APIHandler } from '../content-script/api/APIHandler'
import type { EventData } from '../types/EventData'
import type { StateTransitionInspection } from '../types/StateTransitionInspection'

export interface InspectStateTransitionPayload {
  base64: string
}

/**
 * The one thing the offscreen document does for the public layer: decode a
 * serialized transition.
 *
 * It runs here because `StateTransitionWASM` pulls in pshenmic-dpp, whose
 * shared WebAssembly.Memory needs `crossOriginIsolated`. A content script
 * shares the website's document and never has it, so the public layer asks
 * over messaging instead.
 *
 * No authorization and no storage happen here — the caller decides what to do
 * with the owner and the hash.
 */
export class InspectStateTransitionHandler implements APIHandler {
  inspect (encoded: string): StateTransitionInspection {
    const stateTransition = StateTransitionWASM.fromBytes(base64.decode(encoded))

    return {
      ownerId: stateTransition.getOwnerId()?.base58() ?? null,
      unsignedHash: stateTransition.hash(true),
      signed: stateTransition.signature != null && stateTransition.signature.length !== 0
    }
  }

  async handle (event: EventData): Promise<StateTransitionInspection> {
    const payload: InspectStateTransitionPayload = event.payload

    return this.inspect(payload.base64)
  }

  validatePayload (payload: InspectStateTransitionPayload): null | string {
    if (typeof payload.base64 !== 'string') {
      return 'State transition base64 is not string'
    }

    // Refuse before decoding: the parser runs in the offscreen document that
    // also hosts the wallet API, and page-supplied size is not bounded.
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
