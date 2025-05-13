import React, { PropsWithChildren } from 'react'
import { cva } from 'class-variance-authority'

const highlight = cva(
  'text-brand-darkness',
  {
    variants: {
      variant: {
        light: 'font-normal',
        bold: 'font-bold'
      }
    },
    defaultVariants: {
      variant: 'light'
    }
  }
)

interface OwnProps {
  variant?: 'light' | 'bold'
}

export function Highlight ({ variant, children }: PropsWithChildren<OwnProps>) {
  return <span className={highlight({variant})}>
    {children}
  </span>
}
