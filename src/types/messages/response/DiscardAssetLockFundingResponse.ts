export interface DiscardAssetLockFundingResponse {
  fundingAddress: string
  // The payment that was forgotten, so a caller can show what it let go of.
  fundingTxid: string
  amountDuffs: string | null
}
