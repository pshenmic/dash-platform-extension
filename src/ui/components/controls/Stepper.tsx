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
  'flex items-center justify-center w-8 h-8 shrink-0 rounded-full border text-sm leading-[1.2]',
  {
    variants: {
      status: {
        completed: 'bg-dash-brand border-dash-brand text-white font-medium',
        active: 'bg-dash-brand/[0.04] border-dash-brand text-dash-brand font-extrabold',
        upcoming: 'border-dash-primary-dark-blue/12 text-dash-primary-dark-blue/48 font-medium dark:border-white/12 dark:text-white/48'
      }
    }
  }
)

const labelVariants = cva(
  'whitespace-nowrap !leading-[1.2]',
  {
    variants: {
      status: {
        completed: '!font-medium',
        active: '!font-extrabold !text-dash-brand',
        upcoming: '!font-medium !text-dash-primary-dark-blue/48 dark:!text-white/48'
      }
    }
  }
)

/** Horizontal numbered progress indicator with labelled steps and connectors. */
export function Stepper ({ steps, className }: StepperProps): React.JSX.Element {
  return (
    <ol className={`flex items-center gap-3 w-full ${className ?? ''}`}>
      {steps.map((step, index) => (
        <React.Fragment key={`${index}-${step.label}`}>
          {index > 0 && (
            <li aria-hidden='true' className='flex-1 min-w-3 h-px bg-dash-primary-dark-blue/12 dark:bg-white/12' />
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
            <Text size='sm' className={labelVariants({ status: step.status })}>
              {step.label}
            </Text>
          </li>
        </React.Fragment>
      ))}
    </ol>
  )
}
