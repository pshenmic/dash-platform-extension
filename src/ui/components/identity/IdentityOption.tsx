import React from 'react'
import { Avatar, BigNumber, Identifier, NotActive, Text } from 'dash-ui-kit/react'

export type IdentityOptionVariant = 'simple' | 'full'

export interface IdentityOptionProps {
  /**
   * Identity identifier string
   */
  identity: string

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

export function IdentityOption ({
  identity,
  variant = 'simple',
  balance = null,
  loading = false,
  error = false,
  selected = false,
  identifierProps = {},
  className = '',
  onClick
}: IdentityOptionProps): React.JSX.Element {
  const defaultIdentifierProps = variant === 'simple'
    ? { middleEllipsis: true, edgeChars: 6, avatar: true }
    : { highlight: 'both' as const, copyButton: true, className: 'text-sm font-light' }

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
      <div className='w-10 h-10'>
        <Avatar username={identity} />
      </div>

      <div className='flex flex-1 items-center gap-2'>
        <Identifier {...mergedIdentifierProps}>
          {identity}
        </Identifier>
      </div>

      {(balance != null || loading || error) && (
        <div className='flex flex-col items-end gap-1 text-right shrink-0'>
          <Text weight='semibold' size='sm'>
            {loading
              ? 'Loading...'
              : (
                <>
                  {(error || balance == null)
                    ? <NotActive>n/a</NotActive>
                    : <BigNumber>{balance.toString()}</BigNumber>}
                  Credits
                </>
                )}
          </Text>
          <Text size='xs' className='text-gray-500'>
            ~ $0.00
          </Text>
        </div>
      )}
    </div>
  )
}
