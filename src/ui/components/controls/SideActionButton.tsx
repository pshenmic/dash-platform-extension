import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface SideActionButtonProps {
  icon?: React.ReactNode
  title: string
  subtitle: string
  onClick?: () => void
  disabled?: boolean
  className?: string
}

/** Two-line action button placed next to a type dropdown inside a transfer card. */
export function SideActionButton ({
  icon,
  title,
  subtitle,
  onClick,
  disabled = false,
  className
}: SideActionButtonProps): React.JSX.Element {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 min-w-0 px-3 py-2.5 rounded-[0.9375rem] text-left transition-colors bg-dash-primary-dark-blue/[0.03] dark:bg-white/5 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-dash-primary-dark-blue/[0.05] dark:hover:bg-white/10'
      } ${className ?? ''}`}
    >
      {icon != null && (
        <span className='flex items-center justify-center shrink-0 w-4 h-4 text-dash-primary-dark-blue'>
          {icon}
        </span>
      )}
      <span className='flex flex-col min-w-0'>
        <Text size='sm' weight='medium' className='truncate !leading-[1.3]'>
          {title}
        </Text>
        <Text size='xs' weight='medium' className='truncate !leading-[1.3] !text-dash-brand'>
          {subtitle}
        </Text>
      </span>
    </button>
  )
}
