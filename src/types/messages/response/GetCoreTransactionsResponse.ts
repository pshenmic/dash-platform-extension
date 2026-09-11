export interface CoreTransaction {
  hash: string
  // Explorer's transaction type, e.g. CLASSIC or ASSET_LOCK.
  type: string
  // null while the transaction is still in the mempool.
  blockHeight: number | null
  timestamp: string | null
  // duffs, as a string: bigint does not survive the messaging boundary.
  amount: string
  confirmations: number
  instantLocked: boolean
  chainLocked: boolean
}

export interface GetCoreTransactionsResponse {
  transactions: CoreTransaction[]
  // null once the history is exhausted; otherwise pass it back as `cursor`.
  nextCursor: string | null
}
