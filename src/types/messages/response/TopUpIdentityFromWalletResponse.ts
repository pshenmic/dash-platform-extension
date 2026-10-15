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
  // true when this call finished an operation an earlier one had left with its
  // asset lock already on L1. Nothing was paid, and the amount that arrived is
  // the one that operation started with, not the one this call asked for.
  resumed: boolean
}
