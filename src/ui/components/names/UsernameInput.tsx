import React, { useRef, useEffect, useState } from 'react'
import { Text } from 'dash-ui-kit/react'

interface UsernameInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  disabled?: boolean
}

const containerStyles = 'inline-flex border-b border-gray-300 p-3 rounded-xl focus-within:border-brand-500 transition-colors duration-200 items-baseline'

const inputStyles = 'bg-transparent border-none outline-none font-bold text-gray-900 placeholder-gray-400 min-w-0 flex-shrink-0 text-3xl'

export const UsernameInput: React.FC<UsernameInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter username',
  className,
  autoFocus,
  disabled
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [inputWidth, setInputWidth] = useState(0)

  useEffect(() => {
    if (measureRef.current != null) {
      const textToMeasure = (value !== '' ? value : placeholder !== '' ? placeholder : '') ?? ''
      measureRef.current.textContent = textToMeasure
      const measuredWidth = measureRef.current.offsetWidth
      setInputWidth(Math.max(20, measuredWidth + 4))
    }
  }, [value, placeholder])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const filteredValue = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')
    onChange(filteredValue)
  }

  return (
    <div className='relative'>
      <span
        ref={measureRef}
        className={`${inputStyles} absolute invisible pointer-events-none whitespace-nowrap`}
        aria-hidden='true'
      />

      <div className={`${containerStyles} ${className ?? ''}`}>
        <input
          ref={inputRef}
          type='text'
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={inputStyles}
          style={{ width: `${inputWidth}px` }}
          autoFocus={autoFocus}
          disabled={disabled}
          maxLength={63}
        />
        <Text size='sm' color='blue' className='font-mono text-gray-900'>
          .dash
        </Text>
      </div>
    </div>
  )
}
