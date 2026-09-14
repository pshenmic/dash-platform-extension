import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  /** Plain string is rendered as the muted caption; a node is rendered as is. */
  hint?: React.ReactNode
}

/** Rounded statistics tile used by the dashboard, Core, Platform and Identity screens. */
export function StatCard ({ icon, label, value, hint }: StatCardProps): React.JSX.Element {
  return (
    <div className='flex-1 min-w-0 flex flex-col justify-center gap-4 p-4 rounded-3xl bg-[rgba(12,28,51,0.03)]'>
      <div className='flex items-center gap-2'>
        <div className='w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0'>
          {icon}
        </div>
        <Text size='sm' weight='medium' className='!text-dash-primary-dark-blue/64 !leading-[1.1]'>
          {label}
        </Text>
      </div>
      <div className='flex flex-col gap-2'>
        {value}
        {typeof hint === 'string'
          ? (
            <Text size='xs' weight='medium' className='!text-[0.75rem] !text-dash-primary-dark-blue/50 !leading-[1.1]'>
              {hint}
            </Text>
            )
          : hint}
      </div>
    </div>
  )
}

interface StatValueProps {
  value: React.ReactNode
  unit: string
  hide?: boolean
}

/** Big brand-coloured number with a muted unit, shared by every StatCard. */
export function StatValue ({ value, unit, hide = false }: StatValueProps): React.JSX.Element {
  return (
    <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2]'>
      {hide ? '••••••' : value}{' '}
      <Text as='span' size='sm' weight='medium' className='!text-dash-primary-dark-blue'>{unit}</Text>
    </Text>
  )
}
