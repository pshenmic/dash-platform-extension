import React, { SelectHTMLAttributes } from 'react'
import { cva, VariantProps } from 'class-variance-authority'
import { useTheme } from 'dash-ui/react'
import { ArrowIcon } from '../icons'

const select = cva(
  'w-full transition-all font-inter appearance-none cursor-pointer relative text-[0.875rem] leading-[1.0625rem] focus:ring-2',
  {
    variants: {
      theme: {
        light: 'text-[#0C1C33] bg-white',
        dark: 'text-white bg-gray-800'
      },
      colorScheme: {
        default: 'focus:ring-blue-500/20',
        brand: 'focus:ring-dash-brand/20',
        error: 'focus:ring-red-500/20',
        success: 'focus:ring-green-500/20'
      },
      size: {
        sm: 'dash-block-sm',
        md: 'dash-block-md',
        xl: 'dash-block-xl'
      },
      border: {
        true: 'outline outline-1 outline-offset-[-1px]',
        false: ''
      },
      disabled: {
        false: '',
        true: 'opacity-60 cursor-not-allowed'
      }
    },
    compoundVariants: [
      // Outline colors by colorScheme - only when border is true
      {
        colorScheme: 'default',
        border: true,
        class: 'outline-[rgba(12,28,51,0.35)] focus:outline-[rgba(12,28,51,0.6)]'
      },
      {
        colorScheme: 'brand',
        border: true,
        class: 'outline-dash-brand/30 focus:outline-dash-brand'
      },
      {
        colorScheme: 'error',
        border: true,
        class: 'outline-red-500 focus:outline-red-500'
      },
      {
        colorScheme: 'success',
        border: true,
        class: 'outline-green-500 focus:outline-green-500'
      }
    ],
    defaultVariants: {
      theme: 'light',
      colorScheme: 'default',
      size: 'xl',
      border: true,
      disabled: false
    }
  }
)

const selectContainer = cva(
  'relative w-full',
  {
    variants: {
      size: {
        sm: '',
        md: '',
        xl: ''
      }
    }
  }
)

const selectIcon = cva(
  'absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center justify-center',
  {
    variants: {
      size: {
        sm: 'right-3 w-3 h-3',
        md: 'right-4 w-4 h-4',
        xl: 'right-6 w-4 h-4'
      }
    }
  }
)

type SelectVariants = VariantProps<typeof select>

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>, Omit<SelectVariants, 'theme' | 'disabled'> {
  className?: string
  error?: boolean
  success?: boolean
  border?: boolean
  options?: SelectOption[]
  showArrow?: boolean
}

/**
 * A versatile select component that adapts to light/dark theme,
 * supports various color schemes, sizes, variants, and states.
 * Can display options with avatars and identifiers.
 *
 * @example
 * <Select
 *   options={[{value: 'id1', label: 'Option 1'}, {value: 'id2', label: 'Option 2'}]}
 *   colorScheme="default"
 *   size="xl"
 *   border={true}
 * />
 */
export const Select: React.FC<SelectProps> = ({
  className = '',
  colorScheme,
  size,
  error = false,
  success = false,
  border = true,
  disabled = false,
  options = [],
  showArrow = true,
  value,
  ...props
}) => {
  const { theme } = useTheme()

  // Determine color scheme based on state
  let finalColorScheme = colorScheme
  if (error) finalColorScheme = 'error'
  else if (success) finalColorScheme = 'success'

  const selectClasses = select({
    theme,
    colorScheme: finalColorScheme,
    size,
    border,
    disabled
  }) + ' ' + className

  const containerClasses = selectContainer({ size })
  const iconClasses = selectIcon({ size })

  return (
    <div className={containerClasses}>
      <div className='relative flex items-center'>
        <select
          className={`${selectClasses} ${showArrow ? 'pr-12' : ''}`}
          disabled={disabled}
          value={value}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {showArrow && (
          <div className={iconClasses}>
            <ArrowIcon size={10} color='#0C1C33' className='rotate-[-90deg]' />
          </div>
        )}
      </div>
    </div>
  )
}

export default Select
