import React from 'react'
import { EyeClosedIcon, EyeOpenIcon, RefreshIcon } from 'dash-ui-kit/react'
import { IconButton, type IconButtonVariant } from './IconButton'

interface BalanceActionsProps {
  hide: boolean
  onToggleHide: () => void
  onRefresh: () => void
  variant?: IconButtonVariant
  /** Spins the refresh icon while data is in flight. */
  loading?: boolean
}

/** Hide-balance and refresh pair shown next to every balance amount. */
export function BalanceActions ({
  hide,
  onToggleHide,
  onRefresh,
  variant = 'solid',
  loading = false
}: BalanceActionsProps): React.JSX.Element {
  const iconSize = variant === 'solid' ? 10 : 12
  const iconClassName = 'text-dash-primary-dark-blue'

  return (
    <div className='flex items-center gap-2'>
      <IconButton variant={variant} label={hide ? 'Show balance' : 'Hide balance'} onClick={onToggleHide}>
        {hide
          ? <EyeClosedIcon size={iconSize} className={iconClassName} />
          : <EyeOpenIcon size={iconSize} className={iconClassName} />}
      </IconButton>
      <IconButton variant={variant} label='Refresh' onClick={onRefresh}>
        <RefreshIcon size={iconSize} className={loading ? `animate-spin ${iconClassName}` : iconClassName} />
      </IconButton>
    </div>
  )
}
