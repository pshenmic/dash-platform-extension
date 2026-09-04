export interface ShieldedAddressBalanceEntry {
  // Diversified Orchard address (bech32m) that received the notes.
  address: string
  // Our derivation index for this address, or null when it falls outside the
  // derived window (balance is still counted, only the index is unknown).
  diversifierIndex: number | null
  // balance crosses the messaging boundary as a string (bigint does not
  // serialize); parse with BigInt(...) on the consumer side.
  balance: string
  spendableNotes: number
}

export interface GetShieldedBalanceResponse {
  // balance crosses the messaging boundary as a string (bigint does not
  // serialize); parse with BigInt(...) on the consumer side.
  balance: string
  spendableNotes: number
  totalNotes: number
  // Per-address breakdown of the unspent balance above; the address balances
  // sum to `balance` and the spendableNotes sum to `spendableNotes`.
  byAddress: ShieldedAddressBalanceEntry[]
}
