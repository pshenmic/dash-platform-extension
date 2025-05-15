import React from 'react'
import { cva } from 'class-variance-authority'

const styles = cva(
  `
    btn-base
    select-none
    min-h-11
    flex
    items-center
    font-bold
    capitalize
    transition-colors
    hover:cursor-pointer
    justify-center
    font-main
  `,
  {
    variants: {
      variant: {
        solid: '',
        outline: 'border !bg-transparent',
      },
      color: {
        brand: 'bg-brand hover:bg-brand/80 text-white',
        mint: 'bg-mint hover:bg-mint/80 text-black',
        gray: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
      },
      state: {
        active: 'active:-translate-y-[-1px]',
        disabled: 'hover:!cursor-not-allowed',
      },
      size: {
        sm: 'px-[1rem] py-[0.5rem] rounded-[0.625rem] !font-bold text-sm',
        md: 'px-[1.563rem] py-[0.625rem] rounded-[1.25rem] text-lg',
      },
    },
    compoundVariants: [
      // outline variant
      {
        variant: 'outline',
        state: 'disabled',
        class: 'opacity-40'
      },
      {
        variant: 'outline',
        color: 'brand',
        class: '!text-brand'
      },
      {
        variant: 'outline',
        color: 'mint',
        class: '!text-mint'
      },
      {
        variant: 'outline',
        color: 'gray',
        class: '!text-gray-700'
      },
      // solid variant
      {
        variant: 'solid',
        color: 'brand',
        state: 'disabled',
        class: '!bg-brand/10 !text-brand-dim',
      },
      {
        variant: 'solid',
        color: 'mint',
        state: 'disabled',
        class: '!bg-mint/30 !text-black/60',
      },
    ],
    defaultVariants: {
      variant: 'solid',
      color: 'brand',
      state: 'active',
      size: 'md',
    },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Solid or outline style */
  variant?: 'solid' | 'outline'
  /** Brand or mint color scheme */
  color?: 'brand' | 'mint' | 'gray'
  /** Size of the button */
  size?: 'sm' | 'md'
}

/**
 * Button with solid or outline style, color schemes, disabled state,
 * press animation, and customizable size.
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant,
  color,
  size,
  disabled,
  className = '',
  ...props
}) => {
  const state = disabled ? 'disabled' : 'active'
  const classes =
    styles({ variant, color, size, state }) +
    (className ? ` ${className}` : '')

  return (
    <button className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  )
}

export default Button
