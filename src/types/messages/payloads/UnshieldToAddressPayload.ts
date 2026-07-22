export interface UnshieldToAddressPayload {
  // recipient transparent platform address (pool funds become transparent)
  toPlatformAddress: string
  // amount in credits as a string (bigint does not serialize across messaging)
  amountCredits: string
  password: string
  account?: number
  // optional UTF-8 memo carried inside the shielded spend
  memo?: string
}
