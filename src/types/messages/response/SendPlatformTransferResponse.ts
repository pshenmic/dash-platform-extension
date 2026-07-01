export interface SendPlatformTransferResponse {
  stHash: string
  // amounts as strings (bigint does not serialize); feeCredits is an estimate,
  // not the actual on-chain fee (the SDK does not expose it)
  amountCredits: string
  feeCredits: string
  fromAddress: string
  toAddress: string
}
