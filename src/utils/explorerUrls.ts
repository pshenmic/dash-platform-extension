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

// Explorer page link for an identity.
export const getIdentityExplorerUrl = (identifier: string, network: NetworkType = 'testnet'): string => {
  return `${getExplorerUrl(network)}/identity/${identifier}`
}

interface IdentityTransactionsQuery {
  limit?: number
  page?: number
  order?: 'desc' | 'asc'
}

// Explorer API endpoint for an identity transaction page.
export const buildIdentityTransactionsUrl = (
  apiUrl: string,
  identityId: string,
  { limit, page, order = 'desc' }: IdentityTransactionsQuery = {}
): string => {
  const params = new URLSearchParams({ order })
  if (limit != null) params.set('limit', String(limit))
  if (page != null) params.set('page', String(page))

  return `${apiUrl}/identity/${identityId}/transactions?${params.toString()}`
}
