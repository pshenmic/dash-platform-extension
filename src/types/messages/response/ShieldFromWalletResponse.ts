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
}
