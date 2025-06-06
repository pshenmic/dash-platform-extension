import {StateTransitionStatus} from "./enums/StateTransitionStatus";

export interface StateTransition {
    hash: string
    unsigned: string
    signature?: string
    signaturePublicKeyId?: number
    status: StateTransitionStatus
}
