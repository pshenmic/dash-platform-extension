import React from 'react'
import { Button } from 'dash-ui-kit/react'
import { Banner } from '../../../components/cards'
import { UnfinishedOperationSummary } from '../../../components/transfer'
import type { UnfinishedOperation } from '../../../../utils'

interface UnfinishedOperationBannersProps {
  operations: UnfinishedOperation[]
  onContinue: (operation: UnfinishedOperation) => void
}

// Core operations paid on L1 but not finished on Platform, each with Continue.
export function UnfinishedOperationBanners ({ operations, onContinue }: UnfinishedOperationBannersProps): React.JSX.Element | null {
  if (operations.length === 0) return null

  return (
    <div className='flex flex-col gap-2'>
      {operations.map(operation => (
        <Banner key={operation.fundingTxid} variant='warning'>
          <div className='flex items-center gap-3 w-full'>
            <UnfinishedOperationSummary operation={operation} />
            <Button colorScheme='lightBlue' size='sm' className='shrink-0' onClick={() => onContinue(operation)}>Continue</Button>
          </div>
        </Banner>
      ))}
    </div>
  )
}
