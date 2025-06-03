import React, { useState, useRef, TextareaHTMLAttributes } from 'react'
import { Button } from 'dash-ui/react'
import { cva } from 'class-variance-authority'

const textAreaContainerStyles = cva(
  `
    flex
    items-baseline
    rounded-xl
    transition-colors
    w-full
    font-grotesque
  `,
  {
    variants: {
      hasValue: {
        true: 'bg-[#96A7FF] px-[15px] py-[10px]',
        false: 'bg-[#EDF2FF] px-[15px] py-[10px] pr-[10px]',
      },
      isValid: {
        true: '',
        false: 'border-2 border-red-500',
        null: '',
      },
    },
    defaultVariants: {
      hasValue: false,
      isValid: null,
    },
  }
);

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
        false: 'text-[#96A7FF] placeholder:text-[#96A7FF]',
      },
    },
    defaultVariants: {
      hasValue: false,
    },
  }
)

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  onChange?: (value: string) => void;
  showPasteButton?: boolean;
  validator?: ((value: string) => boolean) | boolean;
  rows?: number;
}

const Textarea: React.FC<TextareaProps> = ({
  onChange,
  showPasteButton = true,
  validator = null,
  rows = 1,
  className = '',
  ...props
}) => {
  const [value, setValue] = useState<string>(props.value as string || props.defaultValue as string || '');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue)
    
    if (typeof onChange === 'function') {
      onChange(newValue)
    }
    
    validateInput(newValue)
  };

  const validateInput = (input: string) => {
    if (validator === null) {
      setIsValid(null)
      return
    }
    
    if (typeof validator === 'function') {
      setIsValid(validator(input))
    } else {
      setIsValid(Boolean(validator))
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setValue(text)
        if (textareaRef.current) {
          textareaRef.current.value = text
        }
        if (onChange) {
          onChange(text)
        }
        validateInput(text)
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err)
    }
  }

  const hasValue = Boolean(value);

  return (
    <div 
      className={textAreaContainerStyles({ 
        hasValue, 
        isValid: typeof isValid === 'boolean' ? isValid : null 
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
        <Button color={'brand'} size={'sm'} onClick={handlePaste}>
          PASTE
        </Button>
      )}
    </div>
  )
}

export default Textarea
