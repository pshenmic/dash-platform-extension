export interface ShieldFromWalletResponse {
  // The Platform side: the shield transition, and what it put into the pool.
  stHash: string
  shieldedAmountCredits: string
  shieldFeeCredits: string
  toShieldedAddress: string
  // The L1 side: the asset lock, and the wallet payment that funded it.
  assetLockTxid: string
  fundingAddress: string
  fundingTxid: string
  coreFeeDuffs: string
  // true when this call finished a shield an earlier one had left with its asset
  // lock already on L1. Nothing was paid, and what reached the pool is what that
  // operation started with, not the amount this call asked for.
  resumed: boolean
}
