import React from 'react'
import { Switch, Text } from 'dash-ui-kit/react'
import { Stepper } from '../../../components/controls'
import type { StepperStatus } from '../../../components/controls'
import { WIZARD_STEP_LABELS } from '../constants'

type TransferView = 'simple' | 'advanced'

interface WizardHeaderProps {
  activeStep: number
  advancedAvailable: boolean
}

const VIEW_OPTIONS = (advancedAvailable: boolean): Array<{ label: string, value: TransferView, disabled?: boolean }> => [
  { label: 'Simple', value: 'simple' },
  { label: 'Advanced', value: 'advanced', disabled: !advancedAvailable }
]

const stepStatus = (index: number, activeStep: number): StepperStatus => {
  if (index < activeStep) return 'completed'
  return index === activeStep ? 'active' : 'upcoming'
}

// Title, Simple / Advanced switch, description and stepper of the send wizard.
export function WizardHeader ({ activeStep, advancedAvailable }: WizardHeaderProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-3'>
        <Text className='text-dash-primary-dark-blue !text-[2.125rem] !font-medium !leading-[1.25] tracking-[-0.03em]'>
          Send
        </Text>
        <Switch<TransferView>
          options={VIEW_OPTIONS(advancedAvailable)}
          value='simple'
          onChange={() => {}}
          size='sm'
        />
      </div>

      <Text size='xs' weight='medium' dim>
        Move funds between your{' '}
        <span className='font-bold text-dash-primary-dark-blue'>Dash Core, Platform addresses, identities and the shielded pool.</span>{' '}
        Pick where the funds come from and where they go.
      </Text>

      <Stepper steps={WIZARD_STEP_LABELS.map((label, index) => ({ label, status: stepStatus(index, activeStep) }))} />
    </div>
  )
}
