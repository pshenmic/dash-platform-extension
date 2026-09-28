import React from 'react'
import { DocumentIcon, Text, TopRightArrowIcon } from 'dash-ui-kit/react'
import { fromBaseUnit } from '../../../utils/bigintUtils'
import type { GetCoreBalanceResponse } from '../../../types/messages/response/GetCoreBalanceResponse'
import { StatCard, StatValue } from '../../components/common'

interface CoreStatisticsProps {
  balance: GetCoreBalanceResponse | null
  hide: boolean
  /** Refreshing: the previous figures stay, each with a spinner. */
  loading?: boolean
}

const PLACEHOLDER = '...'

export function CoreStatistics ({ balance, hide, loading = false }: CoreStatisticsProps): React.JSX.Element {
  const sent = balance != null ? fromBaseUnit(balance.sent, 8) : PLACEHOLDER
  const received = balance != null ? fromBaseUnit(balance.received, 8) : PLACEHOLDER
  // The first load already reads as '...', so only a refresh adds the spinner.
  const refreshing = loading && balance != null

  return (
    <div className='flex flex-col gap-4'>
      <Text size='lg' weight='medium' className='!text-dash-primary-dark-blue/48 !tracking-[-0.03em]'>
        Core Statistics
      </Text>
      <div className='flex gap-3 w-full'>
        <StatCard
          icon={<DocumentIcon size={12} className='!text-dash-brand' />}
          label='Transactions'
          hint={balance != null ? `${balance.usedAddressCount} addresses used` : undefined}
          value={<StatValue value={balance != null ? balance.txCount : PLACEHOLDER} unit='TXs' loading={refreshing} />}
        />
      </div>
      <div className='flex gap-3 w-full'>
        <StatCard
          icon={<TopRightArrowIcon size={12} className='!text-dash-brand' />}
          label='Total Sent'
          value={<StatValue value={sent} unit='Dash' hide={hide} loading={refreshing} />}
        />
        <StatCard
          icon={<TopRightArrowIcon size={12} className='!text-dash-brand rotate-180' />}
          label='Total Received'
          value={<StatValue value={received} unit='Dash' hide={hide} loading={refreshing} />}
        />
      </div>
    </div>
  )
}
