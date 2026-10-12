import React from 'react'
import { Button, Identifier, Text } from 'dash-ui-kit/react'
import { Banner } from '../../../components/cards'
import { CORE_DASH_DECIMALS, formatDashAmount } from '../../../../utils'
import type { UnfinishedTopUp } from '../../../../utils'

interface UnfinishedTopUpBannersProps {
  topUps: UnfinishedTopUp[]
  onRetry: (topUp: UnfinishedTopUp) => void
}

// Core top ups paid on L1 but not finished on Platform, each with Retry.
export function UnfinishedTopUpBanners ({ topUps, onRetry }: UnfinishedTopUpBannersProps): React.JSX.Element | null {
  if (topUps.length === 0) return null

  return (
    <div className='flex flex-col gap-2'>
      {topUps.map(topUp => (
        <Banner key={`${topUp.fundingAddress}-${topUp.fundingTxid}`} variant='warning'>
          <div className='flex items-center gap-3 w-full'>
            <div className='flex flex-col gap-1 min-w-0 flex-1'>
              <Text size='sm'>Unfinished top up of <span className='font-bold'>{formatDashAmount(topUp.lockedDuffs, CORE_DASH_DECIMALS)}</span> Dash to</Text>
              <Identifier avatar={topUp.purpose === 'topUp'} highlight='both' middleEllipsis edgeChars={6} className='!text-xs'>{topUp.recipient}</Identifier>
            </div>
            <Button colorScheme='lightBlue' size='sm' className='shrink-0' onClick={() => onRetry(topUp)}>Retry</Button>
          </div>
        </Banner>
      ))}
    </div>
  )
}
