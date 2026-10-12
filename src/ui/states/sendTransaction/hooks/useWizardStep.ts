import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import type { WizardStep } from '../types'

// Stepper position of each screen; the final screens share the last one.
export const STEP_INDEX: Record<WizardStep, number> = { fromTo: 0, amount: 1, confirm: 2, progress: 3, result: 3, error: 3 }

const ROUTED_STEPS: WizardStep[] = ['fromTo', 'amount', 'confirm', 'progress', 'result', 'error']

const parseStep = (value: string | null): WizardStep =>
  ROUTED_STEPS.find(step => step === value) ?? 'fromTo'

export interface StepNavigation {
  requestedStep: WizardStep
  goToStep: (next: WizardStep, replace?: boolean) => void
}

// Step named by the `step` search param and the setter that changes it.
export function useStepNavigation (): StepNavigation {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const goToStep = (next: WizardStep, replace = false): void => {
    const params = new URLSearchParams(searchParams)
    params.set('step', next)
    setSearchParams(params, { replace, state: location.state })
  }

  return { requestedStep: parseStep(searchParams.get('step')), goToStep }
}

interface WizardStepParams {
  fromToValid: boolean
  amountValid: boolean
  isAdvanced: boolean
  hasOutcome: boolean
  isOperationIdle: boolean
  settledStatus: 'success' | 'failed' | null
}

// Current wizard screen: the requested one, held back to the first step until the draft can reach it.
export function useWizardStep ({ requestedStep, goToStep }: StepNavigation, { fromToValid, amountValid, isAdvanced, hasOutcome, isOperationIdle, settledStatus }: WizardStepParams): WizardStep {
  const step: WizardStep =
    ((requestedStep === 'result' || requestedStep === 'error') && !hasOutcome) || (requestedStep === 'progress' && isOperationIdle)
      ? 'fromTo'
      : (requestedStep === 'amount' && (!fromToValid || isAdvanced)) || (requestedStep === 'confirm' && !amountValid)
          ? 'fromTo'
          : requestedStep

  // Rewrites a step the draft cannot reach yet back to the first step.
  useEffect(() => {
    if (step !== requestedStep) goToStep(step, true)
  }, [step, requestedStep])

  // Moves to the result once the tracked transfer settles.
  useEffect(() => {
    if (settledStatus != null && (step === 'confirm' || step === 'progress')) goToStep(settledStatus === 'success' ? 'result' : 'error', true)
  }, [settledStatus, step])

  return step
}
