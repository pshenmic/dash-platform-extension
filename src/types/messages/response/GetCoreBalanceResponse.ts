export interface GetCoreBalanceResponse {
  // duffs, crossing the messaging boundary as strings (bigint does not
  // serialize); parse with BigInt(...) on the consumer side. `balance` includes
  // deposits still sitting in the mempool.
  balance: string
  received: string
  sent: string
  txCount: number
  // Addresses of this account the explorer has seen on-chain.
  usedAddressCount: number
  // The explorer's own gap-scan: the next index it considers free on each chain.
  nextUnused: { receiving: number, change: number }
}
