export interface WithdrawShieldedToCoreResponse {
  stHash: string
  // amount as a string (bigint does not serialize across messaging)
  amountCredits: string
  toCoreAddress: string
}
