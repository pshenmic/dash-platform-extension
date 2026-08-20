import { NetworkType } from '../types'
import { PLATFORM_EXPLORER_URLS } from '../constants'

const getExplorerUrl = (network: NetworkType = 'testnet'): string => {
  return PLATFORM_EXPLORER_URLS[network].explorer
}

// Explorer page link for a state transition.
export const getTransactionExplorerUrl = (transactionHash: string, network: NetworkType = 'testnet'): string => {
  return `${getExplorerUrl(network)}/transaction/${transactionHash}`
}

// Explorer page link for a platform address.
export const getPlatformAddressExplorerUrl = (address: string, network: NetworkType = 'testnet'): string => {
  return `${getExplorerUrl(network)}/platformAddress/${address}`
}
