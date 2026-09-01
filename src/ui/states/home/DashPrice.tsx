import React from 'react'
import { DashLogo, FilterIcon, Text } from 'dash-ui-kit/react'
import { useStaticAsset } from '../../hooks'
import { DASHBOARD_MOCK } from './mock'

export function DashPrice (): React.JSX.Element {
  const chartSrc = useStaticAsset('dashboard/dash-price-chart.svg')

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
          <div className='flex items-center gap-3'>
            <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2]'>
              {DASHBOARD_MOCK.dashPrice}
            </Text>
            <div className='flex items-center gap-1'>
              <div className='px-2 py-1 rounded-lg bg-[rgba(12,28,51,0.04)]'>
                <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/64'>
                  {DASHBOARD_MOCK.priceWindow}
                </Text>
              </div>
              <Text weight='bold' className='!text-[0.75rem] !text-[#95BF40] !font-extrabold'>
                {DASHBOARD_MOCK.priceChange}
              </Text>
            </div>
          </div>
        </div>
        <div className='flex items-center gap-2.5 px-3 py-2 rounded-full bg-white border border-[rgba(76,126,255,0.12)]'>
          <FilterIcon size={12} className='!text-dash-brand' />
          <Text size='xs' weight='medium' className='!text-[0.75rem]'>
            {DASHBOARD_MOCK.priceRange}
          </Text>
        </div>
      </div>
      <div className='flex flex-col gap-1'>
        <img src={chartSrc} alt='' className='w-full h-32 object-fill' />
        <div className='flex justify-between'>
          {DASHBOARD_MOCK.chartDates.map(date => (
            <Text key={date} size='xs' weight='medium' className='!text-dash-primary-dark-blue/32'>
              {date}
            </Text>
          ))}
        </div>
      </div>
    </div>
  )
}
