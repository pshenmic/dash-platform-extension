export interface TopUpIdentityFromWalletResponse {
  identityId: string
  // The Platform side: the top-up state transition and the credits it added.
  stateTransitionHash: string
  topUpAmount: string
  // The L1 side: the asset lock, and the wallet payment that funded it.
  assetLockTxid: string
  fundingAddress: string
  fundingTxid: string
  // Fee of that payment, in duffs; "0" when the funding address already held a
  // deposit and this call paid nothing.
  coreFeeDuffs: string
}
