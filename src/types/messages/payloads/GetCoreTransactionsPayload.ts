export interface GetCoreTransactionsPayload {
  // How many transactions to return. Defaults to CORE_TRANSACTIONS_DEFAULT_LIMIT.
  limit?: number
  // Opaque cursor from a previous response's `nextCursor`, to read the next page.
  cursor?: string
}
