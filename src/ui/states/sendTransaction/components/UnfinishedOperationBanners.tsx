import React from 'react'
import { Button, Identifier, Text } from 'dash-ui-kit/react'
import { Banner } from '../../../components/cards'
import { CORE_DASH_DECIMALS, formatDashAmount } from '../../../../utils'
import type { UnfinishedOperation } from '../../../../utils'

interface UnfinishedOperationBannersProps {
  operations: UnfinishedOperation[]
  onContinue: (operation: UnfinishedOperation) => void
}

const OPERATION_LABELS: Record<UnfinishedOperation['purpose'], string> = {
  topUp: 'top up',
  fundAddress: 'funding',
  shield: 'shielding'
}

// Core operations paid on L1 but not finished on Platform, each with Continue.
export function UnfinishedOperationBanners ({ operations, onContinue }: UnfinishedOperationBannersProps): React.JSX.Element | null {
  if (operations.length === 0) return null

  return (
    <div className='flex flex-col gap-2'>
      {operations.map(operation => (
        <Banner key={operation.assetLockTxid} variant='warning'>
          <div className='flex items-center gap-3 w-full'>
            <div className='flex flex-col gap-1 min-w-0 flex-1'>
              <Text size='sm'>
                Unfinished {OPERATION_LABELS[operation.purpose]} of <span className='font-bold'>{formatDashAmount(operation.lockedDuffs, CORE_DASH_DECIMALS)}</span> Dash to{operation.recipient == null && ' your shielded balance'}
              </Text>
              {operation.recipient != null && (
                <Identifier avatar={operation.purpose === 'topUp'} highlight='both' middleEllipsis edgeChars={6} className='!text-xs'>{operation.recipient}</Identifier>
              )}
            </div>
            <Button colorScheme='lightBlue' size='sm' className='shrink-0' onClick={() => onContinue(operation)}>Continue</Button>
          </div>
        </Banner>
      ))}
    </div>
  )
}
