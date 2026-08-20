export interface CoreAddressBalance {
  address: string
  // duffs, crossing the messaging boundary as strings (bigint does not
  // serialize); parse with BigInt(...) on the consumer side.
  // Includes deposits still sitting in the mempool.
  balance: string
  // Lifetime totals and transaction count, all derived from mined blocks: they
  // stay at zero while a deposit is unconfirmed, even though `balance` already
  // counts it. So txCount === 0 means "nothing mined yet", NOT "never seen" —
  // an address with a pending deposit reports a balance against a zero txCount.
  received: string
  sent: string
  txCount: number
}

export interface GetCoreAddressesInfosResponse {
  infos: CoreAddressBalance[]
}
