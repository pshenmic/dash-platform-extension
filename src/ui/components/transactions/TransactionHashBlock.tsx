import React from 'react'
import { Text, ValueCard, Identifier } from 'dash-ui-kit/react'
import type { ValueCardProps } from 'dash-ui-kit/react'
import type { NetworkType } from '../../../types'

interface TransactionHashBlockProps {
  hash: string
  network: NetworkType
  variant?: 'full' | 'compact'
  showActions?: boolean
  label?: string
  shadow?: boolean
  colorScheme?: ValueCardProps['colorScheme']
}

export default function TransactionHashBlock ({
  hash,
  variant = 'full',
  showActions = true,
  label = 'Transaction hash',
  shadow = false,
  colorScheme = 'lightGray'
}: TransactionHashBlockProps): React.JSX.Element {
  const isFull = variant === 'full'

  return (
    <div className='flex flex-col gap-2.5'>
      <Text size='md' className='opacity-50 font-medium'>{label}</Text>
      <ValueCard
        colorScheme={colorScheme}
        size='xl'
        className={shadow ? 'dash-shadow-lg' : undefined}
      >
        <Identifier
          highlight='both'
          copyButton={showActions}
          ellipsis={!isFull}
          linesAdjustment={isFull ? false : undefined}
          className={isFull ? 'w-full justify-between' : undefined}
        >
          {hash}
        </Identifier>
      </ValueCard>
    </div>
  )
}
