export interface GetCoreTransactionsPayload {
  // transactions per page, 1..100; defaults to 25
  limit?: number
  // nextCursor from the previous page; omitted for the first page
  cursor?: string
}
