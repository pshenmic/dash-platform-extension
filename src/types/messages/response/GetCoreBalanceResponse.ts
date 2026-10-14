export interface GetCoreBalanceResponse {
  // duffs, crossing the messaging boundary as strings (bigint does not
  // serialize); parse with BigInt(...) on the consumer side. `balance` includes
  // deposits still sitting in the mempool.
  balance: string
  // What can be spent right now: `balance` minus the outputs a send of ours has
  // already consumed and is waiting for a block to confirm, plus the change
  // that send paid us. Use this one for Max and for the balance card; `balance`
  // is the explorer's number and lags a send by a block.
  available: string
  received: string
  sent: string
  txCount: number
  // Addresses of this account the explorer has seen on-chain.
  usedAddressCount: number
  // The explorer's own gap-scan: the next index it considers free on each chain.
  nextUnused: { receiving: number, change: number }
}
