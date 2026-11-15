import React from 'react'
import { Avatar, Identifier, Text } from 'dash-ui-kit/react'
import { DashAmount } from '../common'
import { creditsToDuffs, duffsToDashParts, duffsToFiatLabel, splitDpns } from '../../../utils'

export type IdentityOptionVariant = 'simple' | 'full'

export interface IdentityOptionProps {
  /**
   * Identity identifier string
   */
  identity: string

  /**
   * DPNS name shown above the identifier (for 'full' variant)
   */
  name?: string | null

  /**
   * Display variant
   * - 'simple': Only shows Identifier with avatar (for Select)
   * - 'full': Shows Avatar, Identifier, and balance (for lists)
   */
  variant?: IdentityOptionVariant

  /**
   * Balance in credits (for 'full' variant)
   */
  balance?: bigint | null

  /**
   * DASH/USD rate for the fiat line under the balance (for 'full' variant)
   */
  rate?: number | null

  /**
   * Loading state for balance
   */
  loading?: boolean

  /**
   * Error state for balance
   */
  error?: boolean

  /**
   * Is this identity currently selected
   */
  selected?: boolean

  /**
   * Identifier props customization
   */
  identifierProps?: {
    middleEllipsis?: boolean
    edgeChars?: number
    highlight?: 'start' | 'end' | 'both'
    copyButton?: boolean
    className?: string
  }

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Click handler
   */
  onClick?: () => void
}

function IdentityName ({ name }: { name: string }): React.JSX.Element {
  const { local, tld } = splitDpns(name)

  return (
    <Text size='sm' weight='bold' className='!font-extrabold !text-dash-primary-dark-blue !leading-[1.2] truncate'>
      {local}
      {tld != null && (
        <Text as='span' size='sm' weight='bold' className='!font-extrabold !text-dash-brand !leading-[1.2]'>
          {tld}
        </Text>
      )}
    </Text>
  )
}

export function IdentityOption ({
  identity,
  name = null,
  variant = 'simple',
  balance = null,
  rate = null,
  loading = false,
  error = false,
  selected = false,
  identifierProps = {},
  className = '',
  onClick
}: IdentityOptionProps): React.JSX.Element {
  const defaultIdentifierProps = variant === 'simple'
    ? { middleEllipsis: true, edgeChars: 6, avatar: true }
    : { highlight: 'both' as const, copyButton: true, className: 'text-xs font-light' }

  const mergedIdentifierProps = { ...defaultIdentifierProps, ...identifierProps }

  if (variant === 'simple') {
    return (
      <Identifier
        {...mergedIdentifierProps}
        className={className}
      >
        {identity}
      </Identifier>
    )
  }

  // Full variant
  return (
    <div
      className={`flex items-center gap-3 p-3 border-dash-brand cursor-pointer hover:bg-gray-50 ${
        selected ? 'bg-gray-100 border-l-2' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div className='w-7 h-7 shrink-0'>
        <Avatar username={identity} className='w-7 h-7' />
      </div>

      <div className='flex flex-1 flex-col justify-center gap-1 min-w-0'>
        {name != null && name !== '' && <IdentityName name={name} />}
        <Identifier {...mergedIdentifierProps}>
          {identity}
        </Identifier>
      </div>

      {(balance != null || loading || error) && ((): React.JSX.Element => {
        const duffs = balance != null ? creditsToDuffs(balance) : null
        const parts = duffs != null ? duffsToDashParts(duffs) : null
        const fiat = duffs != null ? duffsToFiatLabel(duffs, rate) : null

        return (
          <div className='flex flex-col items-end gap-1 text-right shrink-0'>
            <DashAmount
              whole={parts?.whole ?? null}
              fraction={parts?.fraction ?? ''}
              hide={false}
              loading={loading && parts == null}
              className='!text-base !leading-tight'
              wholeClassName='font-semibold'
            />
            {fiat != null && (
              <Text size='sm' className='text-gray-500'>
                {fiat}
              </Text>
            )}
          </div>
        )
      })()}
    </div>
  )
}
