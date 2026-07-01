export interface FundPlatformAddressPayload {
  toAddress: string
  // amount in credits as a string (bigint does not serialize across messaging)
  amountCredits: string
  password: string
}
