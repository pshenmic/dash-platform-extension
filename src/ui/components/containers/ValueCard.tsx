import React from 'react'
import { cva, VariantProps } from 'class-variance-authority'
import { useTheme } from '../../contexts/ThemeContext'

const valueCard = cva(
  'flex items-center transition-all border',
  {
    variants: {
      theme: {
        light: 'border-gray-200',
        dark: 'bg-gray-800/50 border-gray-400',
      },
      colorScheme: {
        default: '',
        transparent: 'bg-transparent',
        green: 'text-green-500 bg-green-200 border-green-400',
        lightBlue: 'bg-brand-dim/10 !border-brand/20',
        white: 'bg-white hover:bg-gray-100'
      },
      size: {
        md: 'px-3 py-2 rounded-xl',
        sm: 'px-[0.625rem] py-[0.375rem] text-sm leading-[0.875rem] rounded-[0.25]',
      },
      clickable: {
        false: '',
        true: 'cursor-pointer transition-colors active:translate-y-px active:opacity-90',
      },
      loading: {
        false: '',
        true:  'animate-pulse',
      },
      border: {
        false: '!border-none',
        true: '',
      },
    },
    compoundVariants: [
      // default scheme hover
      { theme: 'light', colorScheme: 'default', clickable: true, class: 'hover:bg-gray-200/50' },
      { theme: 'dark',  colorScheme: 'default', clickable: true, class: 'hover:bg-gray-700/50' },
      // transparent scheme hover
      { theme: 'light', colorScheme: 'transparent', clickable: true, class: 'hover:bg-gray-100' },
      { theme: 'dark',  colorScheme: 'transparent', clickable: true, class: 'hover:bg-gray-900' },
      // green scheme hover
      { theme: 'light', colorScheme: 'green', clickable: true, class: 'hover:bg-green-300' },
      { theme: 'dark',  colorScheme: 'green', clickable: true, class: 'hover:bg-green-400' },
      // green lightBlue
      { colorScheme: 'lightBlue', clickable: true, class: 'hover:bg-brand/15' },
    ],
    defaultVariants: {
      theme:       'light',
      colorScheme: 'default',
      size:        'md',
      clickable:   false,
      loading:     false,
      border:  true,
    },
  }
)

type ValueCardVariants = VariantProps<typeof valueCard>

export interface ValueCardProps extends Omit<ValueCardVariants, 'theme'> {
  /** If you pass an `as` component, it'll receive `href` when `link` is set */
  as?: React.ElementType
  /** Only applies `href` if `as` is `'a'` or a component that accepts `href` */
  link?: string
  className?: string
  children: React.ReactNode
}

/**
 * A card container that adapts to light/dark theme,
 * supports various color schemes, sizes, clickability,
 * loading state, and optional border styling.
 *
 * @example
 * <ValueCard colorScheme="green" border as={Link} link="/foo">
 *   Go
 * </ValueCard>
 */
export const ValueCard: React.FC<ValueCardProps> = ({
  as,
  link,
  colorScheme,
  size,
  clickable,
  loading,
  border,
  className,
  children,
  ...props
}) => {
  const { theme } = useTheme()
  const isClickable = Boolean(link || clickable)

  const classes = valueCard({
    theme,
    colorScheme,
    size,
    clickable: isClickable,
    loading,
    border,
  }) + (className ? ` ${className}` : '')

  // choose element: custom `as`, or <a> if link, else <div>
  const Component = as ?? (link ? 'a' : 'div')

  const mergedProps: any = { ...props, className: classes }
  if (link) mergedProps.href = link

  return <Component {...mergedProps}>{children}</Component>
}

export default ValueCard
