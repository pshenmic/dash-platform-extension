import React from 'react'
import { useOutletContext } from 'react-router-dom'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { getCoreTransactionExplorerUrl, getTransactionExplorerUrl } from '../../../utils'
import { useCoreBalance, useCoreTransactions, useDashRate, useHideBalance, useWalletPlatformData } from '../../hooks'
import type { TransactionRowItem } from '../../components/transactions'
import type { NetworkType } from '../../../types'
import type { OutletContext } from '../../types/OutletContext'
import { ActionRow } from './ActionRow'
import { LastTransaction } from './LastTransaction'
import { LayerCards } from './LayerCards'
import { Statistics } from './Statistics'
import { TotalBalance } from './TotalBalance'
import { newerTransaction } from '../transactions/types'
import { creditsToDuffs } from './amount'
import { useLastPlatformTransaction } from './useLastPlatformTransaction'

// A row links out to the explorer of its own layer.
const explorerUrlFor = (
  transaction: TransactionRowItem | null,
  network: NetworkType | null
): string | undefined => {
  if (transaction?.hash == null || transaction.hash === '') return undefined

  return transaction.layer === 'core'
    ? getCoreTransactionExplorerUrl(transaction.hash, network ?? 'testnet')
    : getTransactionExplorerUrl(transaction.hash, network ?? 'testnet')
}

/**
 * Wallet dashboard (Figma 10681:2603). Route: `#/home`.
 */
function HomeState (): React.JSX.Element {
  const { availableIdentities, currentNetwork, currentWallet } = useOutletContext<OutletContext>()
  const { hideBalance, toggleHide, refresh } = useHideBalance()
  const { balance: coreBalance, loading: coreLoading, reload: reloadCore } = useCoreBalance(currentWallet)
  const { totalCredits, totalTxCount, loading: platformLoading, reload: reloadPlatform } =
    useWalletPlatformData(availableIdentities, currentNetwork)
  const { transaction: lastPlatformTransaction, loading: lastPlatformLoading } =
    useLastPlatformTransaction(availableIdentities, currentNetwork)
  const { transactions: lastCoreTransactions, loading: lastCoreLoading } =
    useCoreTransactions(1, currentNetwork, currentWallet)
  const rate = useDashRate(currentNetwork)

  const coreDuffs = coreBalance != null ? BigInt(coreBalance.balance) : null
  const platformDuffs = platformLoading ? null : creditsToDuffs(totalCredits)
  const balancesLoading = coreLoading || platformLoading
  // The total stays a spinner until both layers are done, then sums whatever answered.
  const totalDuffs = balancesLoading || (coreDuffs == null && platformDuffs == null)
    ? null
    : (coreDuffs ?? 0n) + (platformDuffs ?? 0n)

  const lastTransaction = newerTransaction(lastPlatformTransaction, lastCoreTransactions[0] ?? null)
  const lastTransactionLoading = lastPlatformLoading || lastCoreLoading

  const onRefresh = (): void => {
    refresh()
    reloadCore()
    reloadPlatform()
  }

  return (
    <div className='flex flex-col gap-6'>
      <TotalBalance
        hideBalance={hideBalance}
        totalDuffs={totalDuffs}
        rate={rate}
        loading={balancesLoading}
        onToggleHide={toggleHide}
        onRefresh={onRefresh}
      />
      <LayerCards
        hide={hideBalance}
        coreDuffs={coreDuffs}
        platformDuffs={platformDuffs}
        coreLoading={coreLoading}
        platformLoading={platformLoading}
        rate={rate}
      />
      <ActionRow />
      <Statistics
        identityCount={availableIdentities.length}
        coreTxCount={coreLoading ? null : (coreBalance?.txCount ?? null)}
        platformTxCount={platformLoading ? null : totalTxCount}
        coreLoading={coreLoading}
        platformLoading={platformLoading}
      />
      <LastTransaction
        loading={lastTransactionLoading}
        transaction={lastTransaction}
        explorerUrl={explorerUrlFor(lastTransaction, currentNetwork)}
        layer={lastTransaction != null ? (lastTransaction.layer === 'core' ? 'Core' : 'Platform') : undefined}
      />
    </div>
  )
}

export default withAccessControl(HomeState, { requireWallet: false })
