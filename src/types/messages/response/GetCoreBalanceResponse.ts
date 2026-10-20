export interface GetCoreBalanceResponse {
  // duffs, crossing the messaging boundary as strings (bigint does not
  // serialize); parse with BigInt(...) on the consumer side.
  //
  // The explorer indexes a transaction as soon as it reaches the mempool, so
  // this already accounts for a send made a moment ago - the outputs it spent
  // are gone from it and its change is in. A Max button still cannot be built
  // from it: that needs the fee and the inputs a send would pick, which is
  // ESTIMATE_CORE_TRANSFER with `sendMax`.
  balance: string
  received: string
  sent: string
  txCount: number
  // Addresses of this account the explorer has seen on-chain.
  usedAddressCount: number
  // The explorer's own gap-scan: the next index it considers free on each chain.
  nextUnused: { receiving: number, change: number }
}
