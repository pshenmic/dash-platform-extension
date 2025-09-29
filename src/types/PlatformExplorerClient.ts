import {
  NetworkType,
  TransactionData,
  IdentityApiData,
  TransactionsResponse,
  TokenData,
  TokensResponse
} from './PlatformExplorer'
import { PLATFORM_EXPLORER_URLS } from '../constants'

export {
  NetworkType,
  TransactionData,
  IdentityApiData,
  TransactionsResponse,
  TokenData,
  TokensResponse,
  ApiState
} from './PlatformExplorer'

const getBaseUrl = (network: NetworkType = 'testnet'): string => {
  return PLATFORM_EXPLORER_URLS[network].api
}

const getExplorerUrl = (network: NetworkType = 'testnet'): string => {
  return PLATFORM_EXPLORER_URLS[network].explorer
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

  async fetchMultipleIdentities (identityIds: string[], network: NetworkType = 'testnet'): Promise<Record<string, IdentityApiData>> {
    if (identityIds.length === 0) {
      return {}
    }

    const baseUrl = getBaseUrl(network)

    // Create parallel requests for all identities
    const promises = identityIds.map(async (identityId) => {
      const response = await fetch(`${baseUrl}/identity/${identityId}`)

      if (!response.ok) {
        throw new Error(`HTTP error for identity ${identityId}! status: ${response.status}`)
      }

      const data: IdentityApiData = await response.json()
      return { identityId, data }
    })

    const results = await Promise.allSettled(promises)

    // Process results and separate successful from failed
    const successfulResults: Record<string, IdentityApiData> = {}
    const errors: string[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { identityId, data } = result.value
        successfulResults[identityId] = data
      } else {
        const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason)
        errors.push(`Failed to fetch ${identityIds[index]}: ${errorMessage}`)
      }
    })

    if (errors.length > 0) {
      throw new Error(errors.join('; '))
    }

    return successfulResults
  }

  async fetchTransactions (identityId: string, network: NetworkType = 'testnet', order: 'desc' | 'asc' = 'desc'): Promise<TransactionData[]> {
    const baseUrl = getBaseUrl(network)
    const response = await fetch(`${baseUrl}/identity/${identityId}/transactions?order=${order}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: TransactionsResponse = await response.json()

    if (data.error != null) {
      throw new Error(data.error)
    }

    return data.resultSet
  }

  async fetchTokens (identityId: string, network: NetworkType = 'testnet', limit: number = 10, page: number = 1): Promise<TokenData[]> {
    const baseUrl = getBaseUrl(network)
    const response = await fetch(`${baseUrl}/identity/${identityId}/tokens?limit=${limit}&page=${page}&order=desc`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: TokensResponse = await response.json()

    if (data.error != null) {
      throw new Error(data.error)
    }

    return data.resultSet
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

  getTransactionExplorerUrl (transactionHash: string, network: NetworkType = 'testnet'): string {
    const explorerUrl = getExplorerUrl(network)
    return `${explorerUrl}/transaction/${transactionHash}`
  }
}
