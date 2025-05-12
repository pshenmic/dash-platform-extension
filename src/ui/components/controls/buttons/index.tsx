  import { cva } from 'class-variance-authority'
  import React from 'react'

  const styles = cva(
    'btn-base px-[1.563rem] flex items-center font-bold capitalize transition-colors',
    {
      variants: {
        color: {
          brand: 'bg-brand text-white',
          red: 'bg-red-500 text-white',
          green: 'bg-green-500 text-white',
        },
        state: {
          active: '',
          disabled: '',
        },
      },
      compoundVariants: [
        {
          color: 'brand',
          state: 'disabled',
          class: '!bg-blue-100 text-gray-200 cursor-not-allowed',
        },
        {
          color: 'red',
          state: 'disabled',
          class: 'bg-red-300 text-gray-200 cursor-not-allowed',
        },
        {
          color: 'green',
          state: 'disabled',
          class: 'bg-green-300 text-gray-200 cursor-not-allowed',
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
        // state: 'disabled',
        color: 'brand'
      })}`} {...props}>
        {children}
      </div>
    )
  }
