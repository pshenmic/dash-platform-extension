export interface EstimateShieldedFeeResponse {
  // Amounts cross the messaging boundary as strings (bigint does not serialize);
  // parse with BigInt(...) on the consumer side.
  // Fee for the requested amount, or for the largest spend when no amount is given.
  feeCredits: string
  // Notes that spend uses; the fee grows with each one.
  notesCount: number
  // Largest amount a single spend can send after its fee.
  maxAmountCredits: string
}
