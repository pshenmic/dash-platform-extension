export interface GetShieldedBalanceResponse {
  // balance crosses the messaging boundary as a string (bigint does not
  // serialize); parse with BigInt(...) on the consumer side.
  balance: string
  spendableNotes: number
  totalNotes: number
}
