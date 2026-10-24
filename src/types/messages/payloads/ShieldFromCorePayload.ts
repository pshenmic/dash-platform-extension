export interface ShieldFromCorePayload {
  // The deposit to turn into a shielded note: the asset lock funding address
  // and the transaction that paid it. Both come from SHIELD_FROM_WALLET, or
  // from LIST_PENDING_ASSET_LOCKS when an earlier attempt stopped after the
  // asset lock reached L1.
  assetLockFundingAddress: string
  assetLockFundingTxid: string
  password: string
  // Empty or absent shields to the wallet's own shielded address.
  toShieldedAddress?: string
  memo?: string
  account?: number
}
