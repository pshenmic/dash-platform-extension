import React from 'react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { SeeAllTransactionsButton, TransactionsList, type TransactionRowItem } from '../../components/transactions'
import { useHideBalance } from '../../hooks'
import { ActionRow } from '../home/ActionRow'
import { LastTransaction } from '../home/LastTransaction'
import { CoreBalance } from './CoreBalance'
import { CoreStatistics } from './CoreStatistics'
import { CORE_MOCK } from './mock'

/**
 * Core layer home (Figma 10698:112). Mock balances / txs until Core APIs wire in.
 */
function CoreHomeState (): React.JSX.Element {
  const { hideBalance, toggleHide, refresh } = useHideBalance()

  return (
    <div className='flex flex-col gap-6'>
      <CoreBalance hide={hideBalance} onToggleHide={toggleHide} onRefresh={refresh} />
      <ActionRow scope='core' />
      <div className='flex flex-col gap-4'>
        <TransactionsList
          items={CORE_MOCK.operations.map((op): TransactionRowItem => ({ ...op }))}
          hideAmounts={hideBalance}
          groupByDate={false}
          limit={3}
          footer={(
            <SeeAllTransactionsButton scope='core' />
          )}
        />
        <CoreStatistics hide={hideBalance} />
        <LastTransaction
          hide={hideBalance}
          amount={CORE_MOCK.lastTxAmount}
          hash={CORE_MOCK.lastTxHash}
          layer={CORE_MOCK.lastTxLayer}
          transactionType={CORE_MOCK.lastTxType}
        />
      </div>
    </div>
  )
}

export default withAccessControl(CoreHomeState, { requireWallet: false })
