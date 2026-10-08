import React from 'react'
import { Button, DashLogo, Text } from 'dash-ui-kit/react'
import { StageList } from '../../../components/layout/StageList'
import type { StageListItem } from '../../../components/layout/StageList'
import { KEEP_OPEN_MESSAGE } from '../constants'
import type { TransferStageStatus } from '../types'

interface ProgressStepProps {
  labels: string[]
  stages: TransferStageStatus[]
  isRunning: boolean
  onClose: () => void
}

// Splits "Waiting for confirmation (InstantSend or ChainLock)" into a label and a dimmed hint.
const toStageItem = (label: string, status: TransferStageStatus, index: number): StageListItem => {
  const match = /^(.*?)\s*(\(.+\))$/.exec(label)
  return match != null
    ? { id: String(index), label: match[1], hint: match[2], status }
    : { id: String(index), label, status }
}

// Progress screen of a multi-stage transfer, driven by the tracked operation.
export function ProgressStep ({ labels, stages, isRunning, onClose }: ProgressStepProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-6'>
      <div className='flex justify-center'>
        <DashLogo className='w-12 h-12' color='#4C7EFF' />
      </div>

      <StageList stages={labels.map((label, index) => toStageItem(label, stages[index] ?? 'pending', index))} />

      <div className='flex flex-col gap-3'>
        {isRunning && <Text size='xs' dim className='text-center'>{KEEP_OPEN_MESSAGE}</Text>}
        <Button colorScheme='lightBlue' size='xl' className='w-full' disabled={isRunning} onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
