  import { cva } from 'class-variance-authority'
  import React from 'react'

  const styles = cva(
    `
      btn-base
      select-none
      px-[1.563rem]
      py-[0.625rem]
      min-h-11
      flex
      items-center
      font-bold
      capitalize
      transition-colors
      rounded-[1.25rem]
      hover:cursor-pointer
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
      },
      compoundVariants: [
        {
          color: 'brand',
          state: 'disabled',
          class: '!bg-brand/30',
        },
        {
          color: 'mint',
          state: 'disabled',
          class: '!bg-mint/30 !text-black/80',
        },
      ],
      defaultVariants: {
        color: 'brand',
        state: 'active',
      },
    }
  )

  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    // if you want to add custom variant props you can do it here,
    // e.g. extraVariant?: 'x' | 'y'
  }

  export const Button: React.FC<ButtonProps> = ({ children, ...props }: any) => {

    return (
      <div className={`${styles({
        state: props?.disabled ? 'disabled' : 'active',
        color: props?.color
      })}`} {...props}>
        {children}
      </div>
    )
  }
