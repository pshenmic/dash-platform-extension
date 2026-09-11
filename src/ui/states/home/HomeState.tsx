import React from 'react'
import { useOutletContext } from 'react-router-dom'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useCoreBalance, useDashRate, useHideBalance, useWalletPlatformData } from '../../hooks'
import type { OutletContext } from '../../types/OutletContext'
import { ActionRow } from './ActionRow'
import { LastTransaction } from './LastTransaction'
import { LayerCards } from './LayerCards'
import { Statistics } from './Statistics'
import { TotalBalance } from './TotalBalance'
import { creditsToDuffs } from './amount'
import { useLastPlatformTransaction } from './useLastPlatformTransaction'

/**
 * Wallet dashboard (Figma 10681:2603). Route: `#/home`.
 */
function HomeState (): React.JSX.Element {
  const { availableIdentities, currentNetwork } = useOutletContext<OutletContext>()
  const { hideBalance, toggleHide, refresh } = useHideBalance()
  const { balance: coreBalance, loading: coreLoading, reload: reloadCore } = useCoreBalance()
  const { totalCredits, totalTxCount, loading: platformLoading, reload: reloadPlatform } =
    useWalletPlatformData(availableIdentities, currentNetwork)
  const { transaction: lastTransaction, loading: lastTransactionLoading } =
    useLastPlatformTransaction(availableIdentities, currentNetwork)
  const rate = useDashRate(currentNetwork)

  const coreDuffs = coreBalance != null ? BigInt(coreBalance.balance) : null
  const platformDuffs = platformLoading ? null : creditsToDuffs(totalCredits)
  const totalDuffs = coreDuffs != null && platformDuffs != null ? coreDuffs + platformDuffs : null

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
        onToggleHide={toggleHide}
        onRefresh={onRefresh}
      />
      <LayerCards hide={hideBalance} coreDuffs={coreDuffs} platformDuffs={platformDuffs} rate={rate} />
      <ActionRow />
      <Statistics
        identityCount={availableIdentities.length}
        coreTxCount={coreLoading ? null : (coreBalance?.txCount ?? null)}
        platformTxCount={platformLoading ? null : totalTxCount}
      />
      <LastTransaction
        hide={hideBalance}
        loading={lastTransactionLoading}
        transaction={lastTransaction}
        layer={lastTransaction != null ? 'Platform' : undefined}
        emptyHint='No Platform transactions yet. Core history is not available.'
      />
    </div>
  )
}

export default withAccessControl(HomeState, { requireWallet: false })
