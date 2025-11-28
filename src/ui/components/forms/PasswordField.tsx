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
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  value,
  onChange,
  placeholder = 'Enter password',
  error,
  label = 'Password',
  className,
  variant,
  colorScheme = 'default'
}) => {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <FieldLabel>
        {label}
      </FieldLabel>
      <Input
        type='password'
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size='xl'
        colorScheme={colorScheme}
        variant={variant}
        error={error != null}
        className='w-full'
      />
      {error != null && (
        <Banner variant='error' message={error} className='mt-1' />
      )}
    </div>
  )
}
