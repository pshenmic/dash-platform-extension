import { StateTransitionStatus } from './enums/StateTransitionStatus'

export interface StateTransition {
  signedHash: string | null
  unsignedHash: string
  unsigned: string
  // The transition as it was signed, base64. Null until it is approved.
  signed: string | null
  signature: string | null
  signaturePublicKeyId: number | null
  status: StateTransitionStatus
  error: string | null
  // Origin that asked for the transition, null when the extension built it.
  origin: string | null
}
