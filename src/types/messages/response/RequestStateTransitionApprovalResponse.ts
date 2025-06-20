import {StateTransition} from "../../StateTransition";

export interface RequestStateTransitionApprovalResponse {
  stateTransition: StateTransition,
  redirectUrl: string
}
