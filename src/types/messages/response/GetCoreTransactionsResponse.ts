export interface CoreTransaction {
  hash: string
  // explorer transaction type, e.g. CLASSIC, ASSET_LOCK
  type: string
  // null while the transaction is in the mempool
  blockHeight: number | null
  // ISO time of the block; null while in the mempool
  timestamp: string | null
  confirmations: number
  instantLocked: boolean
  chainLocked: boolean
  // 'received' — paid to the wallet; 'sent' — the wallet paid someone;
  // 'self' — the wallet paid only its own addresses
  direction: 'received' | 'sent' | 'self'
  // Duffs as strings (bigint does not serialize across messaging).
  // Net change of the wallet balance, negative when the wallet paid (fee included).
  amountDuffs: string
  // Paid to the wallet's addresses, change included.
  receivedDuffs: string
  // Spent from the wallet's addresses.
  sentDuffs: string
  // null when the wallet did not pay the fee.
  feeDuffs: string | null
  // Senders of a receipt, recipients of a payment; the wallet's own addresses excluded.
  counterparties: string[]
}

export interface GetCoreTransactionsResponse {
  // newest first; mempool transactions lead the first page
  transactions: CoreTransaction[]
  // pass as `cursor` to get the next page; null on the last page
  nextCursor: string | null
}
