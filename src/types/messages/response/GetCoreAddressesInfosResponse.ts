export interface CoreAddressBalance {
  address: string
  // duffs, crossing the messaging boundary as strings (bigint does not
  // serialize); parse with BigInt(...) on the consumer side.
  balance: string
  received: string
  sent: string
  // Number of transactions the address has appeared in. 0 for an address that
  // has never been seen on-chain.
  txCount: number
}

export interface GetCoreAddressesInfosResponse {
  infos: CoreAddressBalance[]
}
