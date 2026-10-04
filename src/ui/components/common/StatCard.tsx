import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { InlineSpinner } from './InlineSpinner'
import { Skeleton } from './Skeleton'
import { BigNumberDisplay } from '../data'

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
  value: string | number
  unit: string
  hide?: boolean
  /** The value is being refreshed: it stays on screen with a spinner next to it. */
  loading?: boolean
}

/** Big brand-coloured number with a muted unit, shortened when long with the full value in a tooltip. */
export function StatValue ({ value, unit, hide = false, loading = false }: StatValueProps): React.JSX.Element {
  const text = (
    <Text className='!text-dash-brand !text-2xl !font-extrabold !leading-[1.2] [overflow-wrap:anywhere]'>
      {hide ? '••••••' : <BigNumberDisplay unit={unit}>{value}</BigNumberDisplay>}{' '}
      <Text as='span' size='sm' weight='medium' className='!text-dash-primary-dark-blue'>{unit}</Text>
    </Text>
  )

  if (!loading) return text

  return (
    <span className='inline-flex items-center gap-2 min-w-0'>
      {text}
      <InlineSpinner className='w-4 h-4 text-dash-brand' />
    </span>
  )
}

/** Placeholder of a StatValue line while its figure has not loaded yet. */
export function StatValueSkeleton (): React.JSX.Element {
  return <Skeleton className='h-[1.8rem] w-24' />
}

/** Whole StatCard stand-in used by the page skeletons. */
export function StatCardSkeleton ({ withHint = false }: { withHint?: boolean }): React.JSX.Element {
  return (
    <div className='flex-1 min-w-0 flex flex-col justify-center gap-4 p-4 rounded-3xl bg-[rgba(12,28,51,0.03)]'>
      <div className='flex items-center gap-2'>
        <div className='w-6 h-6 rounded-full bg-white shrink-0' />
        <Skeleton className='h-3.5 w-20' />
      </div>
      <div className='flex flex-col gap-2'>
        <StatValueSkeleton />
        {withHint && <Skeleton className='h-3 w-28' />}
      </div>
    </div>
  )
}
