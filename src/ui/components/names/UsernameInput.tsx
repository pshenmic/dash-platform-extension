import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { AutoSizingInput } from '../controls'

interface UsernameInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  disabled?: boolean
}

export const UsernameInput: React.FC<UsernameInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter username',
  className,
  autoFocus,
  disabled
}) => {
  const filterUsername = (inputValue: string): string => {
    return inputValue.replace(/[^a-zA-Z0-9_-]/g, '')
  }

  return (
    <AutoSizingInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
      disabled={disabled}
      maxLength={63}
      onChangeFilter={filterUsername}
      rightContent={
        <Text size='sm' color='blue' className='font-mono text-gray-900'>
          .dash
        </Text>
      }
    />
  )
}
