import {
  NetworkType,
  TransactionData,
  IdentityApiData,
  TransactionsResponse,
  TokenData,
  TokensResponse,
  AddressApiData
} from './PlatformExplorer'
import { PLATFORM_EXPLORER_URLS } from '../constants'
import { buildIdentityTransactionsUrl } from '../utils/explorerUrls'

export {
  NetworkType,
  TransactionData,
  IdentityApiData,
  TransactionsResponse,
  TokenData,
  TokensResponse,
  AddressApiData,
  ApiState,
  ApiPagination
} from './PlatformExplorer'

const getBaseUrl = (network: NetworkType = 'testnet'): string => {
  return PLATFORM_EXPLORER_URLS[network].api
}

export class PlatformExplorerClient {
  async fetchIdentity (identityId: string, network: NetworkType = 'testnet'): Promise<IdentityApiData> {
    const baseUrl = getBaseUrl(network)
    const response = await fetch(`${baseUrl}/identity/${identityId}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  async fetchRate (network: NetworkType = 'testnet'): Promise<number> {
    const baseUrl = getBaseUrl(network)
    const response = await fetch(`${baseUrl}/rate`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    let rate: number | null = null
    if (typeof data === 'number') {
      rate = data
    } else if (typeof data?.usd === 'number') {
      rate = data.usd
    } else if (data?.usd != null) {
      rate = Number(data.usd)
    }

    if (rate == null || Number.isNaN(rate)) {
      throw new Error('Invalid rate value received')
    }

    return rate
  }

  async fetchTransactions (identityId: string, network: NetworkType = 'testnet', order: 'desc' | 'asc' = 'desc'): Promise<TransactionData[]> {
    const baseUrl = getBaseUrl(network)
    const response = await fetch(buildIdentityTransactionsUrl(baseUrl, identityId, { order }))

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: TransactionsResponse = await response.json()

    if (data.error != null) {
      throw new Error(data.error)
    }

    return data.resultSet
  }

  // Single page of identity transactions, pagination envelope included.
  async fetchTransactionsPage (
    identityId: string,
    network: NetworkType = 'testnet',
    limit: number = 10,
    page: number = 1,
    order: 'desc' | 'asc' = 'desc',
    signal?: AbortSignal
  ): Promise<TransactionsResponse> {
    const baseUrl = getBaseUrl(network)
    const url = buildIdentityTransactionsUrl(baseUrl, identityId, { limit, page, order })
    const response = await fetch(url, { signal })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: TransactionsResponse = await response.json()

    if (data.error != null) {
      throw new Error(data.error)
    }

    return data
  }

  async fetchTokens (identityId: string, network: NetworkType = 'testnet', limit: number = 10, page: number = 1): Promise<TokenData[]> {
    const data = await this.fetchTokensPage(identityId, network, limit, page)

    return data.resultSet
  }

  // Single page of identity tokens, pagination envelope included.
  async fetchTokensPage (
    identityId: string,
    network: NetworkType = 'testnet',
    limit: number = 10,
    page: number = 1,
    signal?: AbortSignal
  ): Promise<TokensResponse> {
    const baseUrl = getBaseUrl(network)
    const url = `${baseUrl}/identity/${identityId}/tokens?limit=${limit}&page=${page}&order=desc`
    const response = await fetch(url, { signal })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: TokensResponse = await response.json()

    if (data.error != null) {
      throw new Error(data.error)
    }

    return data
  }

  async fetchNames (identityId: string, network: NetworkType = 'testnet'): Promise<any[]> {
    const identityData = await this.fetchIdentity(identityId, network)
    const aliases = identityData.aliases ?? []

    return aliases.map((alias: any) => ({
      name: (alias.alias ?? alias.name) ?? 'Unknown',
      registrationTime: (alias.timestamp ?? identityData?.timestamp) ?? null,
      status: alias.status
    }))
  }

  async fetchAddress (address: string, network: NetworkType = 'testnet'): Promise<AddressApiData> {
    const baseUrl = getBaseUrl(network)
    const response = await fetch(`${baseUrl}/platformAddress/${address}/info`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }
}
