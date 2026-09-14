import { CoreTransactionsResponse, NetworkType } from './CoreExplorer'
import { CORE_EXPLORER_URLS } from '../constants'
import { buildCoreAddressTransactionsUrl } from '../utils/explorerUrls'

export {
  CoreApiPagination,
  CoreTransactionData,
  CoreTransactionInput,
  CoreTransactionOutput,
  CoreTransactionsResponse
} from './CoreExplorer'

const getBaseUrl = (network: NetworkType = 'testnet'): string => {
  return CORE_EXPLORER_URLS[network].api
}

/**
 * Reads Core (L1) chain data from the dashscan REST API, straight from the UI.
 *
 * The content-script side only reports balances and addresses by account xpub;
 * transaction history is read here, per address, because that is the only shape
 * the explorer offers for it.
 */
export class CoreExplorerClient {
  // Single page of the transactions an address takes part in, on either side.
  // Pending transactions are included, with a null timestamp and block.
  async fetchAddressTransactionsPage (
    address: string,
    network: NetworkType = 'testnet',
    limit: number = 10,
    page: number = 1,
    order: 'desc' | 'asc' = 'desc',
    signal?: AbortSignal
  ): Promise<CoreTransactionsResponse> {
    const baseUrl = getBaseUrl(network)
    const url = buildCoreAddressTransactionsUrl(baseUrl, address, { limit, page, order })
    const response = await fetch(url, { signal })

    // An address the indexer has never seen has no history, not an error.
    if (response.status === 404) {
      return { resultSet: [] }
    }

    if (!response.ok) {
      throw new Error(`Core explorer error for address ${address} transactions: HTTP ${response.status}`)
    }

    const data: CoreTransactionsResponse = await response.json()

    if (data.error != null) {
      throw new Error(data.error)
    }

    return data
  }
}
