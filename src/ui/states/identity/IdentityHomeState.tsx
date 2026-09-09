import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { Tabs } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useExtensionAPI } from '../../hooks'
import { IdentityType } from '../../../types/enums/IdentityType'
import type { NetworkType } from '../../../types'
import type { OutletContext } from '../../types/OutletContext'
import { ActionRow } from '../home/ActionRow'
import { IdentityBalance } from './IdentityBalance'
import { IdentitySelector } from './IdentitySelector'
import { NamesTab } from './NamesTab'
import { TokensTab } from './TokensTab'
import { TransactionsTab } from './TransactionsTab'

/**
 * Identity-scoped home (Figma 10681:1367). Mock amounts / lists until the API pass.
 */
function IdentityHomeState (): React.JSX.Element {
  const { identifier: routeIdentifier } = useParams<{ identifier: string }>()
  const extensionAPI = useExtensionAPI()
  const {
    availableIdentities,
    currentIdentity,
    currentNetwork,
    setCurrentIdentity
  } = useOutletContext<OutletContext>()
  const [hideBalance, setHideBalance] = useState(false)
  const [activeTab, setActiveTab] = useState('transactions')
  const identifier = routeIdentifier ?? currentIdentity ?? ''
  const network: NetworkType = currentNetwork ?? 'testnet'

  const isMasternodeIdentity = useMemo(() => {
    const identity = availableIdentities.find(item => item.identifier === identifier)
    return identity?.type === IdentityType.masternode
  }, [availableIdentities, identifier])

  useEffect(() => {
    if (identifier !== '') {
      setCurrentIdentity(identifier)
    }
  }, [identifier, setCurrentIdentity])

  useEffect(() => {
    extensionAPI.getSettings()
      .then(settings => { setHideBalance(settings.hideBalance) })
      .catch(e => console.log('getSettings error', e))
  }, [extensionAPI])

  useEffect(() => {
    if (isMasternodeIdentity && activeTab === 'names') {
      setActiveTab('transactions')
    }
  }, [isMasternodeIdentity, activeTab])

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
      {identifier !== '' && (
        <IdentitySelector
          identifier={identifier}
          identities={availableIdentities}
          onSelect={setCurrentIdentity}
        />
      )}
      <IdentityBalance hide={hideBalance} onToggleHide={toggleHide} onRefresh={refresh} />
      <ActionRow />
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          {
            value: 'transactions',
            label: 'Transactions',
            content: <TransactionsTab hide={hideBalance} />
          },
          {
            value: 'tokens',
            label: 'Tokens',
            content: <TokensTab hide={hideBalance} network={network} />
          },
          {
            value: 'names',
            label: 'Names',
            disabled: isMasternodeIdentity,
            content: <NamesTab />
          }
        ]}
      />
    </div>
  )
}

export default withAccessControl(IdentityHomeState, { requireWallet: false })
