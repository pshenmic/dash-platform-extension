import React, { useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { TransactionsList } from '../../components/transactions'
import { useCoreBalance, useDashRate, useHideBalance } from '../../hooks'
import type { OutletContext } from '../../types'
import { ActionRow } from '../home/ActionRow'
import { LastTransaction } from '../home/LastTransaction'
import { CoreBalance } from './CoreBalance'
import { CoreStatistics } from './CoreStatistics'

const TRANSACTIONS_UNAVAILABLE = 'Core transaction history is not available yet'

/** Core layer home (Figma 10698:112). Balances are live; Core has no transaction API yet. */
function CoreHomeState (): React.JSX.Element {
  const { currentNetwork, currentWallet } = useOutletContext<OutletContext>()
  const { hideBalance, toggleHide, refresh } = useHideBalance()
  const { balance, loading, reload } = useCoreBalance(currentWallet)
  const rate = useDashRate(currentNetwork)

  const handleRefresh = useCallback((): void => {
    refresh()
    reload()
  }, [refresh, reload])

  return (
    <div className='flex flex-col gap-6'>
      <CoreBalance
        balance={balance}
        loading={loading}
        rate={rate}
        hide={hideBalance}
        onToggleHide={toggleHide}
        onRefresh={handleRefresh}
      />
      <ActionRow scope='core' />
      <div className='flex flex-col gap-4'>
        <TransactionsList
          items={[]}
          hideAmounts={hideBalance}
          groupByDate={false}
          emptyText={TRANSACTIONS_UNAVAILABLE}
        />
        <CoreStatistics balance={balance} hide={hideBalance} />
        <LastTransaction
          hide={hideBalance}
          amount='N/A'
          hash='N/A'
          layer='Core'
          transactionType='Unavailable'
        />
      </div>
    </div>
  )
}

export default withAccessControl(CoreHomeState, { requireWallet: false })
