  import { cva } from 'class-variance-authority'
  import React from 'react'

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
        color: {
          brand: 'bg-brand hover:bg-brand/80 text-white',
          mint: 'bg-mint hover:bg-mint/80 text-black'
        },
        state: {
          active: '',
          disabled: 'hover:!cursor-not-allowed',
        },
        size: {
          sm: 'px-[1rem] py-[0.5rem] rounded-[0.625rem] !font-bold text-sm',
          md: 'px-[1.563rem] py-[0.625rem] rounded-[1.25rem] text-lg'
        }
      },
      compoundVariants: [
        {
          color: 'brand',
          state: 'disabled',
          class: '!bg-brand/10 !text-brand-dim',
        },
        {
          color: 'mint',
          state: 'disabled',
          class: '!bg-mint/30 !text-black/60',
        },
      ],
      defaultVariants: {
        color: 'brand',
        state: 'active',
        size: 'md'
      },
    }
  )

  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    size?: 'sm' | 'md'
  }

  export const Button: React.FC<ButtonProps> = ({ children, className, ...props }: any) => {
    return (
      <button className={`${styles({
        state: props?.disabled ? 'disabled' : 'active',
        color: props?.color,
        size: props?.size
      })} ${className || ''}`} {...props}>
        {children}
      </button>
    )
  }
