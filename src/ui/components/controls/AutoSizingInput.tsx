import React, { useRef, useEffect, useState } from 'react'

interface AutoSizingInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  containerClassName?: string
  inputClassName?: string
  autoFocus?: boolean
  disabled?: boolean
  maxLength?: number
  rightContent?: React.ReactNode
  onChangeFilter?: (value: string) => string
  minWidth?: number
  useDefaultStyles?: boolean
  sizing?: 'auto' | 'fill'
}

const defaultContainerStyles = 'inline-flex border-b border-gray-300 p-3 rounded-xl focus-within:border-brand-500 transition-colors duration-200 items-baseline max-w-full'
const defaultInputStyles = 'bg-transparent border-none outline-none font-bold text-gray-900 placeholder-gray-400 min-w-0 flex-shrink text-3xl'

export const AutoSizingInput: React.FC<AutoSizingInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter text',
  className,
  containerClassName,
  inputClassName,
  autoFocus,
  disabled,
  maxLength,
  rightContent,
  onChangeFilter,
  minWidth = 20,
  useDefaultStyles = true,
  sizing = 'auto'
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [inputWidth, setInputWidth] = useState(0)

  // Determine which styles to use
  const containerStyles = useDefaultStyles ? defaultContainerStyles : ''
  const baseInputStyles = useDefaultStyles ? defaultInputStyles : 'bg-transparent border-none outline-none min-w-0 flex-shrink'

  // Add sizing-specific styles
  const inputStyles = sizing === 'fill' ? `${baseInputStyles} flex-1 w-0` : baseInputStyles

  useEffect(() => {
    // Only measure width in 'auto' mode
    if (sizing === 'auto' && measureRef.current != null) {
      const textToMeasure = (value !== '' ? value : placeholder !== '' ? placeholder : '') ?? ''
      measureRef.current.textContent = textToMeasure
      const measuredWidth = measureRef.current.offsetWidth
      setInputWidth(Math.max(minWidth, measuredWidth + 4))
    }
  }, [value, placeholder, minWidth, sizing])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const inputValue = e.target.value
    const filteredValue = onChangeFilter != null ? onChangeFilter(inputValue) : inputValue
    onChange(filteredValue)
  }

  // Combine input classes
  const finalInputClassName = inputClassName != null ? `${inputStyles} ${inputClassName}` : inputStyles
  const finalContainerClassName = className != null ? `${containerStyles} ${className}` : containerStyles

  return (
    <div className={`relative ${containerClassName ?? ''}`}>
      {/* Hidden span for measuring - only in auto mode */}
      {sizing === 'auto' && (
        <span
          ref={measureRef}
          className={`${finalInputClassName} absolute invisible pointer-events-none whitespace-nowrap`}
          aria-hidden='true'
        />
      )}

      <div className={finalContainerClassName}>
        <input
          ref={inputRef}
          type='text'
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={finalInputClassName}
          style={sizing === 'auto' ? { width: `${inputWidth}px`, maxWidth: '100%' } : undefined}
          autoFocus={autoFocus}
          disabled={disabled}
          maxLength={maxLength}
        />
        {rightContent}
      </div>
    </div>
  )
}
