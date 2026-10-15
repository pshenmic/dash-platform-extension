import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { cva, type VariantProps } from 'class-variance-authority'

const infoCardVariants = cva(
  '',
  {
    variants: {
      appearance: {
        accent: 'rounded-xl p-3 border-l-[2px] dash-shadow-xl',
        plain: 'rounded-3xl p-4'
      },
      borderColor: {
        blue: 'border-l-dash-brand',
        black: 'border-l-dash-primary-dark-blue'
      },
      backgroundColor: {
        default: 'bg-gray-50 dark:bg-gray-800',
        light: 'bg-white dark:bg-gray-900',
        transparent: 'bg-transparent',
        surface: 'bg-[rgba(12,28,51,0.03)]'
      }
    },
    defaultVariants: {
      appearance: 'accent',
      borderColor: 'blue',
      backgroundColor: 'default'
    }
  }
)

interface InfoCardProps extends VariantProps<typeof infoCardVariants> {
  children: React.ReactNode
  title?: string
  /** Element shown at the right of the title row. */
  badge?: React.ReactNode
  className?: string
}

function InfoCard ({
  children,
  title,
  badge,
  appearance,
  borderColor,
  backgroundColor,
  className = ''
}: InfoCardProps): React.JSX.Element {
  if (title == null) {
    return (
      <div className={`${infoCardVariants({ appearance, borderColor, backgroundColor })} ${className}`}>
        {children}
      </div>
    )
  }

  const titleText = (
    <Text size='md' weight='bold' className='!text-dash-primary-dark-blue !leading-[1.2]'>
      {title}
    </Text>
  )

  return (
    <div className={`${infoCardVariants({ appearance, borderColor, backgroundColor })} flex flex-col gap-2 ${className}`}>
      {badge == null
        ? titleText
        : (
          <div className='flex items-center justify-between gap-2'>
            {titleText}
            {badge}
          </div>
          )}
      <Text size='sm' weight='medium' className='!text-dash-primary-dark-blue/50 !leading-[1.35]'>
        {children}
      </Text>
    </div>
  )
}

export default InfoCard
