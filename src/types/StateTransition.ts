import { StateTransitionStatus } from './enums/StateTransitionStatus'

export interface StateTransition {
  signedHash: string | null
  unsignedHash: string
  unsigned: string
  signature: string | null
  signaturePublicKeyId: number | null
  status: StateTransitionStatus
  error: string | null
}
