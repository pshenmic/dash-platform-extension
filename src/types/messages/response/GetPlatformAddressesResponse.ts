export interface GetPlatformAddressesResponse {
  addresses: Array<{
    address: string
    derivationPath: string
    index: number
  }>
}
