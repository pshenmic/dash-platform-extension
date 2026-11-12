import React from 'react'
import { BigNumber, ExternalLinkIcon, Identifier, Text, Tooltip } from 'dash-ui-kit/react'
import type { StatusKey } from 'dash-ui-kit/react'
import { PLATFORM_DASH_DECIMALS, formatDateTime, formatRecentDateTime, fromBaseUnit } from '../../../utils'
import { DashAmount, Skeleton, StatValueSkeleton } from '../common'
import { TypeIcon, fiatLabelFor, type TransactionRowItem } from './TransactionRow'

interface LastTransactionProps {
  /** Shown while the transaction is still being fetched. */
  loading?: boolean
  layer?: string
  /** Explorer page opened by the button in the header. */
  explorerUrl?: string | null
  /** Replaces the default caption of the empty state. */
  emptyHint?: string
  transaction?: TransactionRowItem | null
  /** Masks the amount and fee, following the balance toggle. */
  hide?: boolean
  rate?: number | null
}

const HIDDEN = '••••••'

const STATUS_LABELS: Record<StatusKey, string> = {
  SUCCESS: 'Confirmed',
  FAIL: 'Failed',
  QUEUED: 'Pending',
  POOLED: 'Pending',
  BROADCASTED: 'Broadcasted'
}

const amountOf = (item: TransactionRowItem): number => {
  const amount = typeof item.credits === 'number' ? item.credits : Number(item.credits)

  return Number.isFinite(amount) ? amount : 0
}

const signOf = (item: TransactionRowItem): string => {
  if (item.direction === 'in') return '+ '
  if (item.direction === 'out') return '- '
  return ''
}

interface HeaderProps {
  timestamp?: string | null
  layer?: string
  explorerUrl?: string | null
}

function Header ({ timestamp, layer, explorerUrl }: HeaderProps): React.JSX.Element {
  const time = timestamp != null && timestamp !== '' ? formatRecentDateTime(timestamp) : null
  const fullTime = time != null && timestamp != null ? formatDateTime(new Date(timestamp).getTime()) : undefined

  return (
    <div className='flex items-center justify-between gap-2 min-h-6'>
      <Text size='sm' weight='medium' className='!text-dash-primary-dark-blue/64 !leading-[1.1]'>
        Last Transaction
      </Text>
      <div className='flex items-center gap-2 shrink-0'>
        {time != null && (
          <span title={fullTime}>
            <Text size='xs' className='!text-dash-primary-dark-blue/50 !leading-[1.1]'>
              {time}
            </Text>
          </span>
        )}
        {layer != null && (
          <div className='flex px-3 py-1.5 rounded-full bg-[rgba(76,126,255,0.12)]'>
            <Text weight='medium' className='!text-[10px] !tracking-[-0.03em] !text-dash-brand'>
              {layer}
            </Text>
          </div>
        )}
        {explorerUrl != null && explorerUrl !== '' && (
          <a
            href={explorerUrl}
            target='_blank'
            rel='noopener noreferrer'
            aria-label='View in explorer'
            className='p-1.5 rounded-lg bg-[rgba(12,28,51,0.05)] hover:bg-[rgba(12,28,51,0.1)]'
          >
            <ExternalLinkIcon size={14} className='!text-dash-primary-dark-blue/48' />
          </a>
        )}
      </div>
    </div>
  )
}

/** Amount with a smaller fraction, the same way the balances render it. */
function Amount ({ item, hide }: { item: TransactionRowItem, hide: boolean }): React.JSX.Element {
  const className = `!text-base !leading-[1.2] ${item.direction === 'in' ? '!text-dash-brand' : '!text-dash-primary-dark-blue'}`

  if (item.unit !== 'Dash') {
    return (
      <Text as='span' className={className}>
        {hide ? HIDDEN : <><span className='font-bold'>{signOf(item)}<BigNumber>{item.credits}</BigNumber></span> {item.unit ?? 'Credits'}</>}
      </Text>
    )
  }

  const [whole = '0', fraction = '00'] = String(item.credits).split('.')

  return (
    <span className='inline-flex items-baseline min-w-0'>
      {!hide && <Text as='span' className={`${className} font-bold whitespace-pre`}>{signOf(item)}</Text>}
      <DashAmount whole={whole} fraction={fraction} hide={hide} className={className} />
    </span>
  )
}

/** Shortened counterparty or hash; the full value is in the tooltip. */
function Detail ({ item }: { item: TransactionRowItem }): React.JSX.Element {
  const value = item.detailValue !== '' ? item.detailValue : item.hash ?? ''

  return (
    <span className='inline-flex items-center gap-1 min-w-0'>
      <Text size='xs' className='!leading-[1.2] !text-dash-primary-dark-blue/35 shrink-0'>
        {item.detailLabel}
      </Text>
      <Tooltip
        content={(
          <span className='block max-w-64 break-all font-mono text-[0.625rem] text-dash-primary-dark-blue'>
            {value}
          </span>
        )}
      >
        <span className='cursor-help min-w-0'>
          <Identifier
            weight='light'
            middleEllipsis
            edgeChars={4}
            highlight='both'
            className='!text-[0.625rem] !leading-[1.2]'
          >
            {value}
          </Identifier>
        </span>
      </Tooltip>
    </span>
  )
}

/** Right column: the amount when the transaction moved one, otherwise the fee or status. */
function Value ({ item, hide, rate }: { item: TransactionRowItem, hide: boolean, rate?: number | null }): React.JSX.Element | null {
  const amount = amountOf(item)
  const isFee = item.amountLabel != null
  const fiat = hide ? '~ •••' : fiatLabelFor(item, rate)
  const captionClass = '!text-dash-primary-dark-blue/50 !leading-[1.2] whitespace-nowrap'

  if (!isFee && amount > 0) {
    return (
      <div className='flex flex-col items-end gap-1 shrink-0'>
        <Amount item={item} hide={hide} />
        {fiat !== '' && <Text size='xs' className={captionClass}>{fiat}</Text>}
      </div>
    )
  }

  // A fee is a cost, not a transfer, so it gets neither sign nor accent.
  if (isFee && amount > 0) {
    const feeDash = item.unit === 'Dash' ? String(item.credits) : fromBaseUnit(String(Math.round(amount)), PLATFORM_DASH_DECIMALS)
    // Most fees are far below a cent, where the fiat line would read "~ $0.000".
    const feeFiat = fiat === '~ $0.000' ? '' : fiat

    return (
      <div className='flex flex-col items-end gap-1 shrink-0'>
        <Text size='sm' className='!text-dash-primary-dark-blue !leading-[1.2] whitespace-nowrap'>
          {item.amountLabel}{' '}
          <span className='font-medium'>{hide ? HIDDEN : feeDash}</span> Dash
        </Text>
        {feeFiat !== '' && <Text size='xs' className={captionClass}>{feeFiat}</Text>}
      </div>
    )
  }

  if (item.status == null) return null

  return <Text size='xs' className={captionClass}>{STATUS_LABELS[item.status]}</Text>
}

export function LastTransaction ({
  loading = false,
  layer,
  explorerUrl,
  emptyHint,
  transaction,
  hide = false,
  rate
}: LastTransactionProps): React.JSX.Element {
  if (transaction?.hash == null || transaction.hash === '') {
    return (
      <div className='flex flex-col gap-3 p-4 rounded-3xl bg-[rgba(12,28,51,0.03)]'>
        <Header />
        {loading
          ? (
            <div className='flex flex-col gap-2'>
              <StatValueSkeleton />
              <Skeleton className='h-3 w-40' />
            </div>
            )
          : (
            <div className='flex flex-col gap-2'>
              <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2]'>-</Text>
              <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/50 !leading-[1.1]'>
                {emptyHint ?? 'No transactions yet'}
              </Text>
            </div>
            )}
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-3 p-4 rounded-3xl bg-[rgba(12,28,51,0.03)]'>
      <Header timestamp={transaction.timestamp} layer={layer} explorerUrl={explorerUrl} />
      <div className='flex items-center justify-between gap-3 min-w-0'>
        <div className='flex items-center gap-3 min-w-0'>
          <TypeIcon direction={transaction.direction} status={transaction.status} />
          <div className='flex flex-col gap-1 min-w-0'>
            <Text weight='medium' className='!text-base !text-dash-primary-dark-blue !leading-[1.2] truncate'>
              {transaction.title}
            </Text>
            <Detail item={transaction} />
          </div>
        </div>
        <Value item={transaction} hide={hide} rate={rate} />
      </div>
    </div>
  )
}
