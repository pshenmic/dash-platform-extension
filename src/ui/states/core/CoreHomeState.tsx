import React, { useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { SeeAllTransactionsButton, TransactionsList } from '../../components/transactions'
import { useCoreBalance, useCoreTransactions, useDashRate, useHideBalance } from '../../hooks'
import type { OutletContext } from '../../types'
import { getCoreTransactionExplorerUrl } from '../../../utils'
import { ActionRow } from '../home/ActionRow'
import { LastTransaction } from '../home/LastTransaction'
import { CoreBalance } from './CoreBalance'
import { CoreStatistics } from './CoreStatistics'

const PREVIEW_LIMIT = 3

/** Core layer home (Figma 10698:112). */
function CoreHomeState (): React.JSX.Element {
  const { currentNetwork, currentWallet } = useOutletContext<OutletContext>()
  const { hideBalance, toggleHide, refresh } = useHideBalance()
  const { balance, loading, reload } = useCoreBalance(currentWallet)
  const { transactions, loading: transactionsLoading, error: transactionsError } =
    useCoreTransactions(PREVIEW_LIMIT, currentNetwork, currentWallet)
  const rate = useDashRate(currentNetwork)

  const handleRefresh = useCallback((): void => {
    refresh()
    reload()
  }, [refresh, reload])

  const lastTransaction = transactions[0] ?? null

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
          items={transactions}
          loading={transactionsLoading}
          error={transactionsError}
          rate={rate}
          hideAmounts={hideBalance}
          groupByDate={false}
          onItemClick={(item) => {
            if (item.hash == null || item.hash === '') return

            window.open(getCoreTransactionExplorerUrl(item.hash, currentNetwork ?? 'testnet'), '_blank')
          }}
          footer={(
            <SeeAllTransactionsButton scope='core' />
          )}
        />
        <CoreStatistics balance={balance} hide={hideBalance} />
        <LastTransaction
          loading={transactionsLoading}
          transaction={lastTransaction}
          explorerUrl={lastTransaction?.hash != null
            ? getCoreTransactionExplorerUrl(lastTransaction.hash, currentNetwork ?? 'testnet')
            : undefined}
          layer='Core'
        />
      </div>
    </div>
  )
}

export default withAccessControl(CoreHomeState, { requireWallet: false })
