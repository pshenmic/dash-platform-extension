export interface SendCoreTransactionResponse {
  txid: string
  // All amounts are duffs as strings.
  amountDuffs: string
  feeDuffs: string
  changeDuffs: string
  changeAddress: string | null
  // What was paid, as it was paid: under `sendMax` the amount here is the one
  // that was worked out, not the one asked for.
  outputs: Array<{ address: string, amountDuffs: string }>
  fromAddresses: string[]
}
