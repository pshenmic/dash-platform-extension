export interface ShieldFromCoreResponse {
  // The Platform side: the shield transition, and what it put into the pool.
  stHash: string
  shieldedAmountCredits: string
  shieldFeeCredits: string
  toShieldedAddress: string
  // The asset lock the deposit was turned into.
  assetLockTxid: string
}
