import { CoreAddressChain } from '../../enums/CoreAddressChain'

export interface GetCoreAddressesResponse {
  addresses: Array<{
    address: string
    derivationPath: string
    index: number
    chain: CoreAddressChain
  }>
}
