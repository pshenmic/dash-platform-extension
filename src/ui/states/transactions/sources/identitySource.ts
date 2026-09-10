import type { MutableRefObject } from 'react'
import type { NetworkType, PlatformExplorerClient } from '../../../../types'
import { toTransactionRowItem } from '../../../components/transactions'
import type { TransactionRowItem } from '../../../components/transactions'
import { TRANSACTIONS_PAGE_SIZE, type TransactionsSource } from '../types'

interface IdentitySourceOptions {
  client: PlatformExplorerClient
  identifier: string
  network: NetworkType
  rateRef: MutableRefObject<number | null>
  pageSize?: number
}

/** Paginated explorer cursor for a single identity. */
export function createIdentitySource ({
  client,
  identifier,
  network,
  rateRef,
  pageSize = TRANSACTIONS_PAGE_SIZE
}: IdentitySourceOptions): TransactionsSource {
  let page = 1
  let hasMore = true
  let total: number | null = null

  return {
    key: `identity:${network}:${identifier}`,
    async loadMore (signal: AbortSignal) {
      if (!hasMore) return { items: [], hasMore: false, total }

      const currentPage = page
      const response = await client.fetchTransactionsPage(identifier, network, pageSize, currentPage, 'desc', signal)
      const resultSet = response.resultSet ?? []

      total = response.pagination?.total ?? total
      page += 1
      hasMore = resultSet.length >= pageSize

      const items: TransactionRowItem[] = resultSet.map((transaction, index) => {
        const item = toTransactionRowItem(transaction, rateRef.current)

        // Hashless transactions would otherwise collide on the 'unknown' id.
        if (transaction.hash == null || transaction.hash === '') {
          return { ...item, id: `${identifier}:${currentPage}:${index}` }
        }

        return item
      })

      return { items, hasMore, total }
    }
  }
}
