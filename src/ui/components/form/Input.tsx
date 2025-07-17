import React, { InputHTMLAttributes, useState } from 'react'
import { cva, VariantProps } from 'class-variance-authority'
import { useTheme } from 'dash-ui/react'
import { EyeOpenIcon, EyeClosedIcon } from '../icons'

const input = cva(
  'w-full transition-all font-inter placeholder:text-opacity-60 text-[0.875rem] leading-[1.0625rem]',
  {
    variants: {
      theme: {
        light: 'text-[#111111] placeholder:text-[rgba(17,17,17,0.6)] bg-white',
        dark: 'text-white placeholder:text-gray-400 bg-gray-800'
      },
      colorScheme: {
        default: 'focus:ring-blue-500/20',
        brand: 'focus:ring-dash-brand/20',
        error: 'focus:ring-red-500/20',
        success: 'focus:ring-green-500/20'
      },
      size: {
        sm: 'dash-block-sm font-light',
        md: 'dash-block-md font-light',
        xl: 'dash-block-xl font-light'
      },
      variant: {
        outlined: 'outline outline-1 outline-offset-[-1px]'
      },
      disabled: {
        false: '',
        true: 'opacity-60 cursor-not-allowed'
      }
    },
    compoundVariants: [
      // Outlined variant colors
      {
        variant: 'outlined',
        colorScheme: 'default',
        class: 'outline-[rgba(17,17,17,0.32)] focus:outline-[rgba(17,17,17,0.6)]'
      },
      {
        variant: 'outlined',
        colorScheme: 'brand',
        class: 'outline-dash-brand/30 focus:outline-dash-brand'
      },
      {
        variant: 'outlined',
        colorScheme: 'error',
        class: 'outline-red-500 focus:outline-red-500'
      },
      {
        variant: 'outlined',
        colorScheme: 'success',
        class: 'outline-green-500 focus:outline-green-500'
      },
      // Outlined variant with focus ring
      {
        variant: 'outlined',
        class: 'focus:ring-2'
      }
    ],
    defaultVariants: {
      theme: 'light',
      colorScheme: 'default',
      size: 'xl',
      variant: 'outlined',
      disabled: false
    }
  }
)

type InputVariants = VariantProps<typeof input>

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, Omit<InputVariants, 'theme' | 'disabled'> {
  className?: string
  error?: boolean
  success?: boolean
}

/**
 * A versatile input component that adapts to light/dark theme,
 * supports various color schemes, sizes, variants, and states.
 * For password inputs, includes a toggleable eye icon.
 *
 * @example
 * <Input
 *   type='password'
 *   placeholder='Enter password'
 *   colorScheme='brand'
 *   size='xl'
 * />
 */
export const Input: React.FC<InputProps> = ({
  className = '',
  colorScheme,
  size,
  variant,
  error = false,
  success = false,
  disabled = false,
  type,
  ...props
}) => {
  const { theme } = useTheme()
  const [showPassword, setShowPassword] = useState(false)

  // Determine color scheme based on state
  let finalColorScheme = colorScheme
  if (error) finalColorScheme = 'error'
  else if (success) finalColorScheme = 'success'

  const classes = input({
    theme,
    colorScheme: finalColorScheme,
    size,
    variant,
    disabled
  }) + ' ' + className

  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  const togglePasswordVisibility = (): void => {
    setShowPassword(!showPassword)
  }

  if (isPassword) {
    return (
      <div className='relative'>
        <input
          className={classes + (isPassword ? ' pr-12' : '')}
          disabled={disabled}
          type={inputType}
          {...props}
        />
        <button
          type='button'
          className='absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-70 transition-opacity cursor-pointer focus:outline-none'
          onClick={togglePasswordVisibility}
          tabIndex={-1}
        >
          {showPassword
            ? <EyeClosedIcon size={16} color='#0C1C33' />
            : <EyeOpenIcon size={16} color='#0C1C33' />}
        </button>
      </div>
    )
  }

  return (
    <input
      className={classes}
      disabled={disabled}
      type={inputType}
      {...props}
    />
  )
}

export default Input
