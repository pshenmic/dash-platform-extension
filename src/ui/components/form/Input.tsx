import React, { InputHTMLAttributes } from 'react'
import { cva, VariantProps } from 'class-variance-authority'
import { useTheme } from 'dash-ui/react'

const input = cva(
  'w-full outline-none transition-all font-inter placeholder:text-opacity-60',
  {
    variants: {
      theme: {
        light: 'text-[#111111] placeholder:text-[rgba(17,17,17,0.6)]',
        dark: 'text-white placeholder:text-gray-400 bg-gray-800'
      },
      colorScheme: {
        default: 'border-[rgba(17,17,17,0.32)] focus:border-[rgba(17,17,17,0.6)] focus:ring-blue-500/20',
        brand: 'border-dash-brand/30 focus:border-dash-brand focus:ring-dash-brand/20',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
        success: 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
      },
      size: {
        sm: 'px-3 py-2 text-sm font-light rounded-[10px]',
        md: 'px-[18px] py-3 text-base font-light rounded-[14px]',
        xl: 'px-6 py-4 text-lg font-light rounded-[18px]'
      },
      variant: {
        outlined: 'border bg-transparent',
        filled: 'border-0',
        flushed: 'border-0 border-b-2 rounded-none bg-transparent'
      },
      disabled: {
        false: '',
        true: 'opacity-60 cursor-not-allowed'
      }
    },
    compoundVariants: [
      // Light theme filled variant
      { 
        theme: 'light', 
        variant: 'filled', 
        colorScheme: 'default', 
        class: 'bg-gray-100 focus:bg-gray-50' 
      },
      { 
        theme: 'light', 
        variant: 'filled', 
        colorScheme: 'brand', 
        class: 'bg-dash-brand/10 focus:bg-dash-brand/15' 
      },
      { 
        theme: 'light', 
        variant: 'filled', 
        colorScheme: 'error', 
        class: 'bg-red-50 focus:bg-red-100' 
      },
      { 
        theme: 'light', 
        variant: 'filled', 
        colorScheme: 'success', 
        class: 'bg-green-50 focus:bg-green-100' 
      },
      // Dark theme filled variant
      { 
        theme: 'dark', 
        variant: 'filled', 
        colorScheme: 'default', 
        class: 'bg-gray-700 focus:bg-gray-600' 
      },
      { 
        theme: 'dark', 
        variant: 'filled', 
        colorScheme: 'brand', 
        class: 'bg-dash-brand/20 focus:bg-dash-brand/25' 
      },
      { 
        theme: 'dark', 
        variant: 'filled', 
        colorScheme: 'error', 
        class: 'bg-red-900/30 focus:bg-red-900/40' 
      },
      { 
        theme: 'dark', 
        variant: 'filled', 
        colorScheme: 'success', 
        class: 'bg-green-900/30 focus:bg-green-900/40' 
      },
      // Outlined variant with focus ring
      { 
        variant: 'outlined', 
        class: 'focus:ring-2' 
      },
      // Flushed variant focus colors
      { 
        theme: 'light', 
        variant: 'flushed', 
        colorScheme: 'default', 
        class: 'border-gray-300 focus:border-blue-500' 
      },
      { 
        theme: 'dark', 
        variant: 'flushed', 
        colorScheme: 'default', 
        class: 'border-gray-600 focus:border-blue-400' 
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
 *
 * @example
 * <Input 
 *   type="password" 
 *   placeholder="Enter password" 
 *   colorScheme="brand" 
 *   size="lg"
 *   variant="filled"
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
  ...props
}) => {
  const { theme } = useTheme()
  
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

  return (
    <input
      className={classes}
      disabled={disabled}
      {...props}
    />
  )
}

export default Input 