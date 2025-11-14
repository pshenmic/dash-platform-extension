import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const infoCardVariants = cva(
  'rounded-xl p-3 border-l-[2px] shadow-[0_0_75px_0_rgba(0,0,0,0.1)]',
  {
    variants: {
      borderColor: {
        blue: 'border-l-dash-brand',
        black: 'border-l-dash-primary-dark-blue'
      },
      backgroundColor: {
        default: 'bg-gray-50 dark:bg-gray-800',
        light: 'bg-white dark:bg-gray-900',
        transparent: 'bg-transparent'
      }
    },
    defaultVariants: {
      borderColor: 'blue',
      backgroundColor: 'default'
    }
  }
)

interface InfoCardProps extends VariantProps<typeof infoCardVariants> {
  children: React.ReactNode
  className?: string
}

function InfoCard ({
  children,
  borderColor,
  backgroundColor,
  className = ''
}: InfoCardProps): React.JSX.Element {
  return (
    <div className={`${infoCardVariants({ borderColor, backgroundColor })} ${className}`}>
      {children}
    </div>
  )
}

export default InfoCard

