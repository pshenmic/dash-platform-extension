import React from 'react'
import { Select } from 'dash-ui-kit/react'
import { IdentityOption } from './IdentityOption'

export interface IdentitySelectProps {
  /**
   * Array of identity identifiers
   */
  identities: string[]

  /**
   * Currently selected identity identifier
   */
  value: string | null

  /**
   * Called when identity is selected
   */
  onChange: (identity: string) => void

  /**
   * Whether the select is disabled
   */
  disabled?: boolean

  /**
   * Size of the select component
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'

  /**
   * Show arrow indicator
   */
  showArrow?: boolean

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Custom identity option renderer
   */
  renderOption?: (identity: string) => React.ReactNode
}

export function IdentitySelect ({
  identities,
  value,
  onChange,
  disabled = false,
  size = 'xl',
  showArrow = true,
  className = '',
  renderOption
}: IdentitySelectProps): React.JSX.Element {
  const identityOptions = identities.map(identifier => ({
    value: identifier,
    label: identifier,
    content: renderOption != null
      ? renderOption(identifier)
      : <IdentityOption identity={identifier} variant='simple' />
  }))

  return (
    <Select
      value={value ?? undefined}
      onChange={onChange}
      options={identityOptions}
      showArrow={showArrow}
      size={size}
      disabled={disabled}
      className={className}
    />
  )
}
