export interface SendShieldedTransferPayload {
  // recipient Orchard (shielded) address, Bech32m
  toShieldedAddress: string
  // amount in credits as a string (bigint does not serialize across messaging)
  amountCredits: string
  password: string
  account?: number
  // optional source shielded addresses (bech32m) to spend from; when omitted the
  // spend may draw from any of the account's notes
  fromAddresses?: string[]
  // optional UTF-8 memo carried inside the shielded transfer
  memo?: string
}
