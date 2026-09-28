import React from 'react'
import { Button, Text } from 'dash-ui-kit/react'
import EntityList from '../common/EntityList'
import { TransactionRow, TransactionRowSkeleton, type TransactionRowItem } from './TransactionRow'

// Rows the skeleton shows when the list has no limit of its own.
const SKELETON_ROWS = 3

interface TransactionsListProps {
  items: TransactionRowItem[]
  loading?: boolean
  error?: string | null
  hideAmounts?: boolean
  groupByDate?: boolean
  limit?: number
  footer?: React.ReactNode
  rate?: number | null
  /** Overrides the empty-list message, e.g. when a source has no API yet. */
  emptyText?: string
  /** Shows a retry control when the first page failed. */
  onRetry?: () => void
  onItemClick?: (item: TransactionRowItem) => void
}

interface DateGroup {
  date: string
  items: TransactionRowItem[]
}

function dateKey (item: TransactionRowItem): string {
  if (item.timestamp == null || item.timestamp === '') return 'Unknown date'

  const date = new Date(item.timestamp)
  if (Number.isNaN(date.getTime())) return 'Unknown date'

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function groupItemsByDate (items: TransactionRowItem[]): DateGroup[] {
  const groups: Record<string, TransactionRowItem[]> = {}

  items.forEach(item => {
    const key = dateKey(item)
    if (groups[key] === undefined) groups[key] = []
    groups[key].push(item)
  })

  return Object.entries(groups).map(([date, grouped]) => ({
    date,
    items: grouped
  }))
}

function TransactionsList ({
  items,
  loading = false,
  error = null,
  hideAmounts = false,
  groupByDate = true,
  limit,
  footer,
  rate,
  emptyText = 'No transactions found',
  onRetry,
  onItemClick
}: TransactionsListProps): React.JSX.Element {
  const visible = limit != null ? items.slice(0, limit) : items
  const groups = groupByDate ? groupItemsByDate(visible) : [{ date: '', items: visible }]
  const isEmpty = visible.length === 0

  // First load and reload look the same: the skeleton stands in for the rows.
  if (loading) {
    return (
      <div className='flex flex-col gap-2.5' aria-busy='true' aria-label='Loading transactions'>
        {Array.from({ length: limit ?? SKELETON_ROWS }, (_, index) => (
          <TransactionRowSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-2.5'>
      <EntityList
        loading={false}
        error={error}
        isEmpty={isEmpty}
        variant='spaced'
        errorText={error != null && error !== '' ? `Error loading transactions: ${error}` : undefined}
        emptyText={emptyText}
      >
        {groups.map((group) => (
          <div key={group.date === '' ? 'flat' : group.date} className='flex flex-col gap-2.5'>
            {groupByDate && (
              <Text weight='medium' size='sm' className='text-dash-primary-dark-blue'>
                {group.date}
              </Text>
            )}
            {group.items.map((item) => (
              <TransactionRow
                key={item.id}
                item={item}
                rate={rate}
                hide={hideAmounts}
                onClick={onItemClick != null ? () => { onItemClick(item) } : undefined}
              />
            ))}
          </div>
        ))}
      </EntityList>
      {error === null && !isEmpty && footer}
      {error !== null && onRetry != null && (
        <div className='flex justify-center'>
          <Button
            type='button'
            colorScheme='lightBlue'
            className='!h-auto !min-h-0 !rounded-xl !py-2 !px-6'
            onClick={onRetry}
          >
            <Text size='sm' weight='medium' className='!text-dash-brand'>
              Try Again
            </Text>
          </Button>
        </div>
      )}
    </div>
  )
}

export default TransactionsList
