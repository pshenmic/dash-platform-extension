import React from 'react'
import { RefreshIcon } from 'dash-ui-kit/react'
import { IconButton, type IconButtonVariant } from './IconButton'

interface RefreshButtonProps {
  onClick: () => void
  loading?: boolean
  variant?: IconButtonVariant
  label?: string
}

/** Icon-only refresh button */
export function RefreshButton ({ onClick, loading = false, variant = 'solid', label = 'Refresh' }: RefreshButtonProps): React.JSX.Element {
  return (
    <IconButton variant={variant} label={label} onClick={onClick}>
      <RefreshIcon size={variant === 'solid' ? 10 : 12} className={`text-dash-primary-dark-blue ${loading ? 'animate-spin' : ''}`} />
    </IconButton>
  )
}
