import React from 'react'
import { Text, CheckIcon, CrossIcon } from 'dash-ui-kit/react'
import { InlineSpinner } from '../common'

export type StageStatus = 'pending' | 'active' | 'done' | 'failed'

export interface StageListItem {
  id: string
  label: string
  hint?: string
  status: StageStatus
}

const STATUS_LABELS: Record<StageStatus, string> = {
  pending: 'Pending',
  active: 'In progress',
  done: 'Done',
  failed: 'Failed'
}

interface StageListProps {
  stages: StageListItem[]
  className?: string
}

/** Icon reflecting the current status of a stage. */
function StageStatusIcon ({ status }: { status: StageStatus }): React.JSX.Element {
  switch (status) {
    case 'done':
      return (
        <div className='flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-dash-brand/15 text-dash-brand'>
          <CheckIcon size={12} color='currentColor' />
        </div>
      )
    case 'active':
      return (
        <div className='flex items-center justify-center w-6 h-6 shrink-0'>
          <InlineSpinner className='w-5 h-5 text-dash-brand' />
        </div>
      )
    case 'failed':
      return (
        <div className='flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-red-500/15 text-red-500'>
          <CrossIcon size={10} color='currentColor' />
        </div>
      )
    default:
      return <div className='w-6 h-6 shrink-0 rounded-full border-2 border-dash-primary-dark-blue/15 dark:border-white/20' />
  }
}

/** Vertical list of transfer stages, each shown as a row card with a status icon. */
export function StageList ({ stages, className }: StageListProps): React.JSX.Element {
  return (
    <ol aria-live='polite' className={`flex flex-col gap-2.5 ${className ?? ''}`}>
      {stages.map(stage => (
        <li
          key={stage.id}
          className='flex items-center gap-3 px-3 py-3.5 rounded-[0.9375rem] bg-dash-primary-dark-blue/[0.03] dark:bg-white/5'
        >
          <StageStatusIcon status={stage.status} />
          <Text
            size='sm'
            weight='medium'
            className={stage.status === 'failed' ? '!text-red-500' : ''}
            dim={stage.status === 'pending'}
          >
            {stage.label}
            {stage.hint != null && <span className='opacity-50'> {stage.hint}</span>}
            <span className='sr-only'> - {STATUS_LABELS[stage.status]}</span>
          </Text>
        </li>
      ))}
    </ol>
  )
}
