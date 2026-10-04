import React from 'react'
import { Text, CheckmarkIcon } from 'dash-ui-kit/react'
import { cva } from 'class-variance-authority'

export type StepperStatus = 'completed' | 'active' | 'upcoming'

export interface StepperStep {
  label: string
  status: StepperStatus
}

interface StepperProps {
  steps: StepperStep[]
  className?: string
}

const circleVariants = cva(
  'flex items-center justify-center w-6 h-6 shrink-0 rounded-full text-xs font-medium',
  {
    variants: {
      status: {
        completed: 'bg-dash-brand text-white',
        active: 'bg-dash-brand/10 border border-dash-brand text-dash-brand',
        upcoming: 'bg-dash-primary-dark-blue/5 text-dash-primary-dark-blue/50 dark:bg-white/10 dark:text-white/50'
      }
    }
  }
)

const labelVariants = cva(
  'whitespace-nowrap',
  {
    variants: {
      status: {
        completed: '',
        active: '!text-dash-brand',
        upcoming: '!text-dash-primary-dark-blue/50 dark:!text-white/50'
      }
    }
  }
)

/** Horizontal numbered progress indicator with labelled steps and connectors. */
export function Stepper ({ steps, className }: StepperProps): React.JSX.Element {
  return (
    <ol className={`flex items-center gap-2 w-full ${className ?? ''}`}>
      {steps.map((step, index) => (
        <React.Fragment key={`${index}-${step.label}`}>
          {index > 0 && (
            <li aria-hidden='true' className='flex-1 min-w-3 h-px bg-dash-primary-dark-blue/15 dark:bg-white/15' />
          )}
          <li
            className='flex items-center gap-2 shrink-0'
            aria-current={step.status === 'active' ? 'step' : undefined}
          >
            <span className={circleVariants({ status: step.status })}>
              {step.status === 'completed'
                ? <CheckmarkIcon size={11} color='currentColor' />
                : index + 1}
            </span>
            <Text size='sm' weight='medium' className={labelVariants({ status: step.status })}>
              {step.label}
            </Text>
          </li>
        </React.Fragment>
      ))}
    </ol>
  )
}
