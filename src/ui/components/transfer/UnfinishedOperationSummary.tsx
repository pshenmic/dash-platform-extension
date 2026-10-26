import React from 'react'
import { Identifier, Text } from 'dash-ui-kit/react'
import { CORE_DASH_DECIMALS, formatDashAmount } from '../../../utils'
import type { UnfinishedOperation } from '../../../utils'

const OPERATION_LABELS: Record<UnfinishedOperation['purpose'], string> = {
  topUp: 'top up',
  fundAddress: 'funding',
  shield: 'shielding'
}

// What an unfinished Core operation paid and to whom.
export function UnfinishedOperationSummary ({ operation }: { operation: UnfinishedOperation }): React.JSX.Element {
  return (
    <div className='flex flex-col gap-1 min-w-0 flex-1'>
      <Text size='sm'>
        Unfinished {OPERATION_LABELS[operation.purpose]} of <span className='font-bold'>{formatDashAmount(operation.lockedDuffs, CORE_DASH_DECIMALS)}</span> Dash to{operation.recipient == null && ' your shielded balance'}
      </Text>
      {operation.recipient != null && (
        <Identifier size='xs' avatar={operation.purpose === 'topUp'} highlight='both' middleEllipsis edgeChars={6}>{operation.recipient}</Identifier>
      )}
    </div>
  )
}
