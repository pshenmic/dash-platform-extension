export interface WithdrawShieldedToCorePayload {
  // Core (L1) recipient address (P2PKH or P2SH); output privacy is lost on L1
  toCoreAddress: string
  // amount in credits as a string (bigint does not serialize across messaging)
  amountCredits: string
  password: string
  account?: number
  // optional UTF-8 memo carried inside the shielded spend
  memo?: string
}
