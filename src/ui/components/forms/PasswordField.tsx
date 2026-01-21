import React from 'react'
import { Input } from 'dash-ui-kit/react'
import { Banner } from '../cards'
import { FieldLabel } from '../typography'

interface PasswordFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string | null
  label?: string
  className?: string
  variant?: 'outlined' | 'filled'
  colorScheme?: 'default' | 'brand'
  autoFocus?: boolean
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(({
  value,
  onChange,
  placeholder = 'Enter password',
  error,
  label = 'Password',
  className,
  variant,
  colorScheme = 'default',
  autoFocus
}, ref) => {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <FieldLabel>
        {label}
      </FieldLabel>
      <Input
        ref={ref}
        type='password'
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size='xl'
        colorScheme={colorScheme}
        variant={variant}
        error={error != null}
        autoFocus={autoFocus}
        className='w-full'
      />
      {error != null && (
        <Banner variant='error' message={error} className='mt-1' />
      )}
    </div>
  )
})
