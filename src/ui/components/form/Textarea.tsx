import React, { useState, useRef, TextareaHTMLAttributes } from 'react'
import { Button } from 'dash-ui/react'
import { cva, VariantProps } from 'class-variance-authority'

const textAreaContainerStyles = cva(
  `
    flex
    items-baseline
    transition-colors
    w-full
    font-grotesque
  `,
  {
    variants: {
      hasValue: {
        true: 'bg-[#96A7FF]',
        false: 'bg-[#EDF2FF]'
      },
      isValid: {
        true: '',
        false: 'outline outline-2 outline-red-500 outline-offset-[-2px]',
        null: ''
      },
      size: {
        sm: 'dash-block-sm',
        md: 'dash-block-md',
        xl: 'dash-block-xl text-base'
      }
    },
    compoundVariants: [
      // Add extra padding for PASTE button when no value
      { hasValue: false, size: 'sm', class: 'pr-[10px]' },
      { hasValue: false, size: 'md', class: 'pr-[10px]' },
      { hasValue: false, size: 'xl', class: 'pr-[10px]' }
    ],
    defaultVariants: {
      hasValue: false,
      isValid: null,
      size: 'md'
    }
  }
)

const textAreaStyles = cva(
  `
    text-2xl
    font-medium
    text-2xl
    bg-transparent
    outline-none
    resize-none
    w-full
  `,
  {
    variants: {
      hasValue: {
        true: 'text-white',
        false: 'text-[#96A7FF] placeholder:text-[#96A7FF]'
      }
    },
    defaultVariants: {
      hasValue: false
    }
  }
)

type TextareaVariants = VariantProps<typeof textAreaContainerStyles>

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'size'>, Omit<TextareaVariants, 'hasValue' | 'isValid'> {
  onChange?: (value: string) => void
  showPasteButton?: boolean
  validator?: ((value: string) => boolean) | boolean
  rows?: number
}

const Textarea: React.FC<TextareaProps> = ({
  onChange,
  showPasteButton = true,
  validator = null,
  rows = 1,
  size = 'md',
  className = '',
  ...props
}) => {
  const [value, setValue] = useState<string>((props.value as string) ?? (props.defaultValue as string) ?? '')
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const newValue = e.target.value
    setValue(newValue)

    if (typeof onChange === 'function') {
      onChange(newValue)
    }

    validateInput(newValue)
  }

  const validateInput = (input: string): void => {
    if (validator === null) {
      setIsValid(null)
      return
    }

    if (typeof validator === 'function') {
      setIsValid(validator(input))
    } else {
      setIsValid(Boolean(validator))
    }
  }

  const handlePaste = (): void => {
    navigator.clipboard.readText()
      .then((text) => {
        if (text !== '') {
          setValue(text)
          if (textareaRef.current != null) {
            textareaRef.current.value = text
          }
          if (onChange != null) {
            onChange(text)
          }
          validateInput(text)
        }
      })
      .catch((err) => {
        console.error('Failed to read clipboard contents: ', err)
      })
  }

  const hasValue = value !== ''

  return (
    <div
      className={textAreaContainerStyles({
        hasValue,
        isValid: typeof isValid === 'boolean' ? isValid : null,
        size
      })}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        rows={rows}
        className={`${textAreaStyles({ hasValue })} ${className}`}
        {...props}
      />

      {showPasteButton && !hasValue && (
        <Button color='brand' size='sm' onClick={handlePaste}>
          PASTE
        </Button>
      )}
    </div>
  )
}

export default Textarea
