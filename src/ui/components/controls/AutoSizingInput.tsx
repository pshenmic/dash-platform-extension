import React, { useRef, useEffect, useState } from 'react'

interface AutoSizingInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  containerClassName?: string
  autoFocus?: boolean
  disabled?: boolean
  maxLength?: number
  rightContent?: React.ReactNode
  onChangeFilter?: (value: string) => string
}

const containerStyles = 'inline-flex border-b border-gray-300 p-3 rounded-xl focus-within:border-brand-500 transition-colors duration-200 items-baseline max-w-full'
const inputStyles = 'bg-transparent border-none outline-none font-bold text-gray-900 placeholder-gray-400 min-w-0 flex-shrink text-3xl'

export const AutoSizingInput: React.FC<AutoSizingInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter text',
  className,
  containerClassName,
  autoFocus,
  disabled,
  maxLength,
  rightContent,
  onChangeFilter
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
    const inputValue = e.target.value
    const filteredValue = onChangeFilter != null ? onChangeFilter(inputValue) : inputValue
    onChange(filteredValue)
  }

  return (
    <div className={`relative ${containerClassName ?? ''}`}>
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
          style={{ width: `${inputWidth}px`, maxWidth: '100%' }}
          autoFocus={autoFocus}
          disabled={disabled}
          maxLength={maxLength}
        />
        {rightContent}
      </div>
    </div>
  )
}
