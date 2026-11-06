export interface RecoverAssetLockFundsResponse {
  txid: string
  fromAddress: string
  toAddress: string
  // What the destination receives: the whole deposit, less the network fee.
  amountDuffs: string
  feeDuffs: string
}
