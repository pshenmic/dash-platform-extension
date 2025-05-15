import React from 'react'
import { cva, VariantProps } from 'class-variance-authority'
import { useTheme } from '../contexts/ThemeContext'

const textStyles = cva(
  '', {
    variants: {
      reset: {
        false: 'inline whitespace-normal',
        true:  '',
      },
      theme: {
        light: 'text-gray-900',
        dark:  'text-gray-100',
      },
      color: {
        default: '',
        blue:    '!text-brand-dark dark:text-brand-dim',
      },
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
      },
      weight: {
        normal: 'font-normal',
        bold:   'font-bold',
      },
      italic: {
        false: '',
        true:  'italic',
      },
      underline: {
        false: '',
        true:  'underline',
      },
      lineThrough: {
        false: '',
        true:  'line-through',
      },
      transform: {
        none:       '',
        uppercase:  'uppercase',
        capitalize: 'capitalize',
      },
      opacity: {
        0:   'opacity-0',
        10:  'opacity-10',
        20:  'opacity-20',
        30:  'opacity-30',
        40:  'opacity-40',
        50:  'opacity-50',
        60:  'opacity-60',
        70:  'opacity-70',
        80:  'opacity-80',
        90:  'opacity-90',
        100: 'opacity-100',
      },
      monospace: {
        false: '',
        true:  'font-mono',
      },
      dim: {
        false: '',
        true:  'text-gray-500 dark:text-gray-400',
      },
    },
    defaultVariants: {
      reset:      false,
      theme:      'light',
      color:      'default',
      size:       'md',
      weight:     'normal',
      italic:     false,
      underline:  false,
      lineThrough:false,
      transform:  'none',
      opacity:    100,
      monospace:  false,
      dim:        false,
    },
  }
)

type TextVariants = Omit<VariantProps<typeof textStyles>, 'theme'>

export interface TextProps extends TextVariants {
  /** Render as this element or component (e.g. 'h1' or Link). */
  as?: React.ElementType
  /** Additional CSS classes. */
  className?: string
  /** Text children. */
  children?: React.ReactNode
}

/**
 * A versatile text component with size, color, weight, decoration,
 * transform, opacity, monospace, dimming, and theme-aware defaults.
 */
export const Text: React.FC<TextProps> = ({ as, className = '', children, ...variantProps }) => {
  const { theme } = useTheme()

  const classes = textStyles({
    ...variantProps,
    theme,
  }) + (className ? ` ${className}` : '')

  const Component = as ?? 'span'
  return <Component className={classes}>{children}</Component>
}

export default Text
