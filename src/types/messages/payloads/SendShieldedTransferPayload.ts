export interface SendShieldedTransferPayload {
  // recipient Orchard (shielded) address, Bech32m
  toShieldedAddress: string
  // amount in credits as a string (bigint does not serialize across messaging)
  amountCredits: string
  password: string
  account?: number
  // optional UTF-8 memo carried inside the shielded transfer
  memo?: string
}
