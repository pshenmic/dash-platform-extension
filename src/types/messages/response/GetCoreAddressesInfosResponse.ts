export interface CoreAddressBalance {
  address: string
  // duffs, crossing the messaging boundary as a string (bigint does not
  // serialize); parse with BigInt(...) on the consumer side. Includes deposits
  // still sitting in the mempool.
  balance: string
  // Transactions the address has appeared in, counted over mined blocks only:
  // it stays at zero while a deposit is unconfirmed, even though `balance`
  // already counts it. So 0 means "nothing mined yet", NOT "never seen".
  txCount: number
}

export interface GetCoreAddressesInfosResponse {
  infos: CoreAddressBalance[]
}
