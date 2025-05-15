import React from 'react'
import { cva } from 'class-variance-authority'

const notActiveStyles = cva(
  'text-sm italic text-gray-400'
)

export interface NotActiveProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode
  className?: string
}

export function NotActive ({ children, className, ...props }: NotActiveProps) {
  return (
    <span
      className={`${notActiveStyles()} ${className ?? ''}`}
      {...props}
    >
      {children ?? 'n/a'}
    </span>
  )
}
