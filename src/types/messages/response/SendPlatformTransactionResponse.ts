export interface SendPlatformTransactionResponse {
  stHash: string
  // credits as strings
  //
  // What the recipients received in total, without the fee.
  amountCredits: string
  // The minimum Platform demanded of this transition; it grows with every
  // recipient.
  feeCredits: string
  fromAddress: string
  outputs: Array<{ address: string, amountCredits: string }>
}
