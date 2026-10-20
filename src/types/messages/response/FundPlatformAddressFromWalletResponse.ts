export interface FundPlatformAddressFromWalletResponse {
  platformAddress: string
  // The Platform side: the address funding state transition.
  stateTransitionHash: string
  // The L1 side: the asset lock, and the wallet payment that funded it.
  assetLockTxid: string
  fundingAddress: string
  fundingTxid: string
  // Fee of that payment, in duffs; "0" when the funding address already held a
  // deposit and this call paid nothing.
  coreFeeDuffs: string
  // true when this call finished an operation an earlier one had left with its
  // asset lock already on L1. Nothing was paid, and the credits that arrived are
  // the ones that operation started with, not the amount this call asked for.
  resumed: boolean
}
