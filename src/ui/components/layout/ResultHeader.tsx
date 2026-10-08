import React from 'react'
import { Text, CheckIcon, CrossIcon } from 'dash-ui-kit/react'
import { FiatChip } from '../common'

interface ResultHeaderProps {
  status: 'success' | 'error'
  amount: React.ReactNode
  usd?: string | null
  message: string
  className?: string
}

/** Final transfer header with a status icon, the amount with its USD value and a message. */
export function ResultHeader ({ status, amount, usd, message, className }: ResultHeaderProps): React.JSX.Element {
  const isSuccess = status === 'success'

  return (
    <div className={`flex flex-col items-center gap-3 text-center ${className ?? ''}`}>
      <div className={`flex items-center justify-center w-12 h-12 rounded-full text-white ${isSuccess ? 'bg-dash-brand' : 'bg-red-500'}`}>
        {isSuccess
          ? <CheckIcon size={22} color='currentColor' />
          : <CrossIcon size={18} color='currentColor' />}
      </div>
      <div className='flex items-center justify-center gap-2 flex-wrap'>
        <Text size='xl' className='!leading-[1.2]'>
          {amount}
        </Text>
        {usd !== undefined && (
          <FiatChip
            label={usd}
            hide={false}
            className='bg-dash-brand/10 px-2 py-[3px]'
            textClassName='!text-dash-brand'
          />
        )}
      </div>
      <Text size='xs' weight='medium' dim>
        {message}
      </Text>
    </div>
  )
}
