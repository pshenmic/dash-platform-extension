export interface TopUpIdentityResponse {
  identityId: string
  stateTransitionHash: string
  topUpAmount: string
  // The L1 side of the top-up, for a caller that shows both layers.
  assetLockTxid: string
}
