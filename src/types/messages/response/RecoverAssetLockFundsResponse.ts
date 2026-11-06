export interface RecoverAssetLockFundsResponse {
  txid: string
  fromAddress: string
  toAddress: string
  amountDuffs: string
  feeDuffs: string
  changeDuffs: string
  // True when the address was drained and marked used, so it stops being offered.
  swept: boolean
}
