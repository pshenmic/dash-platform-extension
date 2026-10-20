export interface RegisterIdentityFromWalletResponse {
  identifier: string
  // The Platform side: the identity create state transition.
  stateTransitionHash: string
  // The L1 side: the asset lock, and the wallet payment that funded it.
  assetLockTxid: string
  fundingAddress: string
  fundingTxid: string
  // Fee of that payment, in duffs; "0" when the funding address already held a
  // deposit and this call paid nothing.
  coreFeeDuffs: string
  // true when this call finished a registration an earlier one had left with its
  // asset lock already on L1. Nothing was paid, and the identity was created
  // with what that operation started with.
  resumed: boolean
}
