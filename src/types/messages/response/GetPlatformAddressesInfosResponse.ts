export interface PlatformAddressBalance {
  address: string
  // balance crosses the messaging boundary as a string (bigint does not
  // serialize); parse with BigInt(...) on the consumer side.
  balance: string
  nonce: number
}

export interface GetPlatformAddressesInfosResponse {
  infos: PlatformAddressBalance[]
}
