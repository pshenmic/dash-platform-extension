export interface FundPlatformAddressFromCorePayload {
  // platform address to credit
  platformAddress: string
  // asset lock funding address (Core L1) the user deposited to, and the deposit txid
  assetLockFundingAddress: string
  assetLockFundingTxid: string
  password: string
}
