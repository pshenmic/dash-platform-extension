import { base64 } from '@scure/base'
import { StateTransitionWASM } from 'dash-platform-sdk/types'
import { MAX_STATE_TRANSITION_SIZE_BASE64 } from '../constants'
import type { StateTransitionInspection } from '../types/StateTransitionInspection'

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
export function inspectStateTransition (encoded: string): StateTransitionInspection {
  // Refuse before decoding: the parser runs in the offscreen document that
  // also hosts the wallet API, and page-supplied size is not bounded.
  if (encoded.length > MAX_STATE_TRANSITION_SIZE_BASE64) {
    throw new Error(`State transition is too large: ${encoded.length} base64 characters, maximum ${MAX_STATE_TRANSITION_SIZE_BASE64}`)
  }

  const stateTransition = StateTransitionWASM.fromBytes(base64.decode(encoded))

  return {
    ownerId: stateTransition.getOwnerId()?.base58() ?? null,
    unsignedHash: stateTransition.hash(true),
    signed: stateTransition.signature != null && stateTransition.signature.length !== 0
  }
}
