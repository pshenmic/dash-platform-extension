import { StateTransitionStatus } from './enums/StateTransitionStatus'

export interface StateTransition {
  hash: string
  unsigned: string
  signature: string | null
  signaturePublicKeyId: number | null
  status: StateTransitionStatus
}
