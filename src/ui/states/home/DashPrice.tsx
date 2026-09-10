import React from 'react'
import { DashLogo, Text } from 'dash-ui-kit/react'

interface DashPriceProps {
  rate: number | null
}

/**
 * Current DASH price. The percent change and the chart stay hidden: the
 * explorer only returns the current rate, there is no historical series.
 */
export function DashPrice ({ rate }: DashPriceProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-8 p-4 rounded-3xl bg-[rgba(12,28,51,0.03)]'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <div className='w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0'>
              <DashLogo size={12} className='!text-dash-brand' />
            </div>
            <Text size='sm' weight='medium' className='!text-dash-primary-dark-blue/64 !leading-[1.1]'>
              Dash Price
            </Text>
          </div>
          <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2]'>
            {rate != null ? `$${rate.toFixed(2)}` : '-'}
          </Text>
        </div>
      </div>
    </div>
  )
}
