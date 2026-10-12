import React from 'react'
import { Button, Text } from 'dash-ui-kit/react'
import { InfiniteScrollSentinel } from '../common/InfiniteScrollSentinel'

interface TransactionsFooterProps {
  hasMore: boolean
  loadingMore: boolean
  error: string | null
  onLoadMore: () => void
}

/** Lazy loading controls under the list: sentinel plus a visible fallback. */
export function TransactionsFooter ({
  hasMore,
  loadingMore,
  error,
  onLoadMore
}: TransactionsFooterProps): React.JSX.Element {
  if (!hasMore && error === null) {
    return (
      <Text size='xs' weight='medium' className='!text-center !text-dash-primary-dark-blue/35'>
        No more transactions
      </Text>
    )
  }

  return (
    <div className='flex flex-col items-center gap-2'>
      <InfiniteScrollSentinel onVisible={onLoadMore} disabled={!hasMore || loadingMore || error !== null} />
      {error !== null && (
        <Text size='xs' weight='medium' className='!text-center !text-dash-primary-dark-blue/50'>
          Could not load more: {error}
        </Text>
      )}
      <Button
        type='button'
        colorScheme='lightBlue'
        disabled={loadingMore}
        className='!h-auto !min-h-0 !rounded-xl !py-2 !px-6'
        onClick={onLoadMore}
      >
        <Text size='sm' weight='medium' className='!text-dash-brand'>
          {loadingMore ? 'Loading...' : error !== null ? 'Retry' : 'Load More'}
        </Text>
      </Button>
    </div>
  )
}

export default TransactionsFooter
