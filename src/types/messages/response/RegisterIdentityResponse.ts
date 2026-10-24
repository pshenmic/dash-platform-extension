export interface RegisterIdentityResponse {
  identifier: string
  stateTransitionHash: string
  // The L1 side of the registration, for a caller that shows both layers.
  assetLockTxid: string
}
