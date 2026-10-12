import React from 'react'
import { Button, Text } from 'dash-ui-kit/react'
import ScreenLoader from '../../../components/layout/screens/ScreenLoader'
import { KEEP_OPEN_MESSAGE, PROGRESS_TITLE } from '../constants'

interface ProgressStepProps {
  isRunning: boolean
  onClose: () => void
}

// Progress screen of a multi-step transfer: one loader while the transfer runs.
export function ProgressStep ({ isRunning, onClose }: ProgressStepProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col items-center gap-4 py-6'>
        <ScreenLoader className='min-h-0' />
        <Text weight='bold' className='text-center'>{PROGRESS_TITLE}</Text>
      </div>

      <div className='flex flex-col gap-3'>
        {isRunning && <Text size='xs' dim className='text-center'>{KEEP_OPEN_MESSAGE}</Text>}
        <Button colorScheme='lightBlue' size='xl' className='w-full' disabled={isRunning} onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
