import React, { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useExtensionAPI } from '../../hooks'
import type { OutletContext } from '../../types/OutletContext'
import { ActionRow } from './ActionRow'
import { DashPrice } from './DashPrice'
import { LastTransaction } from './LastTransaction'
import { LayerCards } from './LayerCards'
import { Statistics } from './Statistics'
import { TotalBalance } from './TotalBalance'

/**
 * Wallet dashboard (Figma 10681:2603). Preview at `#/dashboard`.
 * Balances / stats / chart are mock until Core + overview APIs exist.
 */
function HomeState (): React.JSX.Element {
  const extensionAPI = useExtensionAPI()
  const { availableIdentities } = useOutletContext<OutletContext>()
  const [hideBalance, setHideBalance] = useState(false)

  useEffect(() => {
    extensionAPI.getSettings()
      .then(settings => { setHideBalance(settings.hideBalance) })
      .catch(e => console.log('getSettings error', e))
  }, [extensionAPI])

  const toggleHide = useCallback((): void => {
    const next = !hideBalance
    setHideBalance(next)
    extensionAPI.setSettings(next).catch(e => console.log('setSettings error', e))
  }, [extensionAPI, hideBalance])

  const refresh = useCallback((): void => {
    extensionAPI.getIdentities().catch(e => console.log('refresh identities error', e))
  }, [extensionAPI])

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
