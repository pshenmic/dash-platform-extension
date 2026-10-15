import React from 'react'
import { Text, CheckmarkIcon } from 'dash-ui-kit/react'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: React.ReactNode
  disabled?: boolean
  className?: string
}

/** On/off switch with an optional clickable label on the left. */
export function Toggle ({ checked, onChange, label, disabled = false, className }: ToggleProps): React.JSX.Element {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 text-left ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className ?? ''}`}
    >
      {label != null && (
        <Text size='sm' className='!text-dash-primary-dark-blue/50 dark:!text-white/50'>
          {label}
        </Text>
      )}
      <span
        className={`flex items-center justify-center w-5 h-5 shrink-0 rounded-full transition-colors ${
          checked
            ? 'bg-dash-brand/15 text-dash-brand'
            : 'bg-dash-primary-dark-blue/5 dark:bg-white/10'
        }`}
      >
        {checked && <CheckmarkIcon size={11} color='currentColor' />}
      </span>
    </button>
  )
}
