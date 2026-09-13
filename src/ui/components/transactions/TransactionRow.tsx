import React from 'react'
import { BigNumber, CopyButton, DocumentIcon, Identifier, Text, TopRightArrowIcon, TransactionStatusIcon } from 'dash-ui-kit/react'
import type { StatusKey } from 'dash-ui-kit/react'
import { creditsToDash } from '../../../utils'

export type TransactionDirection = 'in' | 'out' | 'neutral'

export type TransactionLayer = 'core' | 'platform'

export interface TransactionRowItem {
  id: string
  title: string
  detailLabel: string
  detailValue: string
  /** Credits on Platform rows, Dash on Core ones - `unit` says which. */
  credits: string | number
  unit?: string
  /** Set when the number is not the transfer amount (explorer only gives us the fee). */
  amountLabel?: string
  /** Which chain the row came from; decides where its hash links out to. */
  layer?: TransactionLayer
  direction: TransactionDirection
  /** Settlement status; absent when the source does not report one. */
  status?: StatusKey | null
  hash?: string | null
  timestamp?: string | null
  detailAsIdentifier?: boolean
}

function creditSign (direction: TransactionDirection): string {
  if (direction === 'in') return '+ '
  if (direction === 'out') return '-'
  return ''
}

interface TransactionRowProps {
  item: TransactionRowItem
  hide: boolean
  onClick?: () => void
  rate?: number | null
}

/** Fiat is derived at render time so a late-arriving rate repaints every row. */
export function fiatLabelFor (item: TransactionRowItem, rate: number | null | undefined): string {
  if (rate == null) return ''

  const amount = typeof item.credits === 'number' ? item.credits : Number(item.credits)
  if (!Number.isFinite(amount) || amount <= 0) return ''

  const dash = item.unit === 'Dash' ? amount : creditsToDash(amount)

  return `~ $${(dash * rate).toFixed(3)}`
}

function TypeIcon ({ direction, status }: { direction: TransactionDirection, status?: StatusKey | null }): React.JSX.Element {
  return (
    <div className='relative shrink-0'>
      <div className='w-10 h-10 rounded-2xl bg-dash-brand flex items-center justify-center'>
        {direction === 'neutral'
          ? <DocumentIcon size={16} className='!text-white' />
          : (
            <TopRightArrowIcon
              size={16}
              className={`!text-white ${direction === 'in' ? 'rotate-180' : ''}`}
            />
            )}
      </div>
      {status != null && (
        <span
          title={status}
          className='absolute -top-1 -right-1 w-[0.875rem] h-[0.875rem] rounded-full bg-white flex items-center justify-center'
        >
          <TransactionStatusIcon status={status} size={10} />
        </span>
      )}
    </div>
  )
}

export function TransactionRow ({ item, hide, onClick, rate }: TransactionRowProps): React.JSX.Element {
  const isIn = item.direction === 'in'
  // A fee is a cost, not a directional amount, so it gets neither colour nor sign.
  const isFee = item.amountLabel != null
  const amountClass = isIn && !isFee ? '!text-dash-brand' : ''
  const unit = item.unit ?? 'Credits'

  const clickable = onClick != null

  // A div, not a button: the copy control below is itself a button and cannot nest inside one.
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!clickable) return
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onClick?.()
      }}
      className={`flex items-center justify-between gap-3 rounded-[14px] bg-[rgba(12,28,51,0.04)] py-2 pl-2 pr-[15px] w-full text-left border-0 ${clickable ? 'cursor-pointer hover:bg-[rgba(12,28,51,0.07)] transition-colors' : 'cursor-default'}`}
    >
      <div className='flex items-center gap-3 min-w-0'>
        <TypeIcon direction={item.direction} status={item.status} />
        <div className='flex flex-col gap-1 min-w-0'>
          <Text size='sm' weight='medium' className='!leading-[1.2]'>
            {item.title}
          </Text>
          <div className='flex items-center gap-1 min-w-0'>
            <Text size='xs' className='!font-sans !leading-[1.2] !text-dash-primary-dark-blue/35 shrink-0'>
              {item.detailLabel}
            </Text>
            {item.detailAsIdentifier === true
              ? (
                <Identifier
                  middleEllipsis
                  edgeChars={4}
                  highlight='both'
                  className='!text-[0.625rem] !font-light !leading-[1.2] min-w-0'
                >
                  {item.detailValue}
                </Identifier>
                )
              : (
                <Text size='xs' className='!font-sans !leading-[1.2] text-dash-primary-dark-blue truncate'>
                  {item.detailValue}
                </Text>
                )}
            {item.detailValue !== '' && (
              <CopyButton
                text={item.detailValue}
                aria-label='Copy hash'
                className='opacity-40 hover:opacity-100 [&_svg]:w-3 [&_svg]:h-3'
              />
            )}
          </div>
        </div>
      </div>
      <div className='flex flex-col items-end gap-1 shrink-0'>
        <Text size='sm' weight='medium' className={`!leading-[1.2] ${amountClass}`}>
          {isFee && !hide && <span className='font-normal'>{item.amountLabel ?? ''} </span>}
          <span className='font-extrabold inline-flex items-baseline'>
            {hide
              ? '••••••'
              : (
                <>
                  {!isFee && creditSign(item.direction)}
                  <BigNumber>{item.credits}</BigNumber>
                </>
                )}
          </span>
          {' '}{unit}
        </Text>
        <Text size='xs' weight='medium' className={`!leading-[1.2] ${isIn && !isFee ? '!text-dash-brand' : '!text-dash-primary-dark-blue/35'}`}>
          {hide ? '~ •••' : fiatLabelFor(item, rate)}
        </Text>
      </div>
    </div>
  )
}
