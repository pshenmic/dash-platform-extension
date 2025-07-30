import { StateTransitionStatus } from './enums/StateTransitionStatus'

interface StateTransitionDetails {
  type: string
}

export interface StateTransition {
  hash: string
  unsigned: string
  signature: string | null
  signaturePublicKeyId: number | null
  status: StateTransitionStatus,
  details?: StateTransitionDetails
}
