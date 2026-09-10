import React from 'react'
import { useOutletContext } from 'react-router-dom'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useHideBalance } from '../../hooks'
import type { OutletContext } from '../../types/OutletContext'
import { ActionRow } from './ActionRow'
import { DashPrice } from './DashPrice'
import { LastTransaction } from './LastTransaction'
import { LayerCards } from './LayerCards'
import { Statistics } from './Statistics'
import { TotalBalance } from './TotalBalance'

/**
 * Wallet dashboard (Figma 10681:2603). Route: `#/home`.
 * Balances / stats / chart are mock until Core + overview APIs exist.
 */
function HomeState (): React.JSX.Element {
  const { availableIdentities } = useOutletContext<OutletContext>()
  const { hideBalance, toggleHide, refresh } = useHideBalance()

  return (
    <div className='flex flex-col gap-6'>
      <TotalBalance hideBalance={hideBalance} onToggleHide={toggleHide} onRefresh={refresh} />
      <LayerCards hide={hideBalance} />
      <ActionRow />
      <Statistics identityCount={availableIdentities.length} />
      <LastTransaction hide={hideBalance} />
      <DashPrice />
    </div>
  )
}

export default withAccessControl(HomeState, { requireWallet: false })
