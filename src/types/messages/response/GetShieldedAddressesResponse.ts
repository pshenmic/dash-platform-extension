export interface GetShieldedAddressesResponse {
  addresses: Array<{
    address: string
    derivationPath: string
    diversifierIndex: number
  }>
}
