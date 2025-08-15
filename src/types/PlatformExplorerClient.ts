import { 
  NetworkType, 
  TransactionData, 
  IdentityApiData, 
  TransactionsResponse 
} from './PlatformExplorer'

// Re-export types for convenience
export { 
  NetworkType, 
  TransactionData, 
  IdentityApiData, 
  TransactionsResponse 
} from './PlatformExplorer'

const getBaseUrl = (network: NetworkType = 'testnet'): string => {
  const baseUrls: Record<NetworkType, string> = {
    testnet: 'https://testnet.platform-explorer.pshenmic.dev',
    mainnet: 'https://platform-explorer.pshenmic.dev'
  }
  return baseUrls[network]
}

const getExplorerUrl = (network: NetworkType = 'testnet'): string => {
  const explorerUrls: Record<NetworkType, string> = {
    testnet: 'https://testnet.platform-explorer.com',
    mainnet: 'https://platform-explorer.com'
  }
  return explorerUrls[network]
}

// No utility functions needed - all fields are explicitly typed

export class PlatformExplorerClient {
  async fetchIdentity(identityId: string, network: NetworkType = 'testnet'): Promise<IdentityApiData> {
    const baseUrl = getBaseUrl(network)
    const response = await fetch(`${baseUrl}/identity/${identityId}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  }

  async fetchMultipleIdentities(identityIds: string[], network: NetworkType = 'testnet'): Promise<Record<string, IdentityApiData>> {
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
        errors.push(`Failed to fetch ${identityIds[index]}: ${result.reason}`)
      }
    })

    if (errors.length > 0) {
      throw new Error(errors.join('; '))
    }

    return successfulResults
  }

  async fetchTransactions(identityId: string, network: NetworkType = 'testnet', order: 'desc' | 'asc' = 'desc'): Promise<TransactionData[]> {
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

  getTransactionExplorerUrl(transactionHash: string, network: NetworkType = 'testnet'): string {
    const explorerUrl = getExplorerUrl(network)
    return `${explorerUrl}/transaction/${transactionHash}`
  }
}

