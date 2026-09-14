import type { CoreExplorerClient, CoreTransactionData, NetworkType } from '../../../../types'
import { toCoreTransactionRowItem } from '../../../components/transactions'
import type { TransactionRowItem } from '../../../components/transactions'
import { TRANSACTIONS_PAGE_SIZE, type TransactionsSource } from '../types'
import { mergeSources } from './mergeSources'

interface CoreSourceOptions {
  client: CoreExplorerClient
  /** Every Core address of the wallet - it decides direction and amount of each row. */
  addresses: string[]
  network: NetworkType
  pageSize?: number
}

interface CoreAddressSourceOptions extends Omit<CoreSourceOptions, 'addresses'> {
  address: string
  ownedAddresses: Set<string>
}

/** Paginated dashscan cursor for a single Core address. */
function createCoreAddressSource ({
  client,
  address,
  ownedAddresses,
  network,
  pageSize = TRANSACTIONS_PAGE_SIZE
}: CoreAddressSourceOptions): TransactionsSource {
  let page = 1
  let hasMore = true
  let total: number | null = null

  return {
    key: `core:${network}:${address}`,
    async loadMore (signal: AbortSignal) {
      if (!hasMore) return { items: [], hasMore: false, total }

      const currentPage = page
      const response = await client.fetchAddressTransactionsPage(address, network, pageSize, currentPage, 'desc', signal)
      const resultSet = response.resultSet ?? []

      // An empty index reports -1 rather than 0.
      const reported = response.pagination?.total
      total = reported != null && reported >= 0 ? reported : total
      page += 1
      hasMore = resultSet.length >= pageSize

      const items: TransactionRowItem[] = resultSet.map((transaction: CoreTransactionData, index) => {
        const item = toCoreTransactionRowItem(transaction, ownedAddresses)

        // Hashless transactions would otherwise collide on the 'unknown' id.
        if (transaction.hash == null || transaction.hash === '') {
          return { ...item, id: `${address}:${currentPage}:${index}` }
        }

        return item
      })

      return { items, hasMore, total }
    }
  }
}

/**
 * Core transaction history for the whole wallet. dashscan indexes history per
 * address and has no per-xpub list, so every wallet address is its own cursor
 * and the merge drops the duplicates a transaction between two of them makes.
 */
export function createCoreSource (key: string, { client, addresses, network, pageSize }: CoreSourceOptions): TransactionsSource {
  const ownedAddresses = new Set(addresses)
  const sources = addresses.map(address =>
    createCoreAddressSource({ client, address, ownedAddresses, network, pageSize })
  )

  return mergeSources(key, sources, pageSize)
}
