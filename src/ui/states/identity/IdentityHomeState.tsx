import React, { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { Tabs } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useHideBalance } from '../../hooks'
import { IdentityType } from '../../../types/enums/IdentityType'
import type { NetworkType } from '../../../types'
import type { OutletContext } from '../../types/OutletContext'
import { ActionRow } from '../home/ActionRow'
import { IdentityBalance } from './IdentityBalance'
import { IdentityIdRow } from './IdentityIdRow'
import { NamesTab } from './NamesTab'
import { TokensTab } from './TokensTab'
import { TransactionsTab } from './TransactionsTab'
import { useIdentityHomeData } from './useIdentityHomeData'

function IdentityHomeState (): React.JSX.Element {
  const { identifier: routeIdentifier } = useParams<{ identifier: string }>()
  const {
    availableIdentities,
    currentIdentity,
    currentNetwork,
    setCurrentIdentity
  } = useOutletContext<OutletContext>()
  const { hideBalance, toggleHide } = useHideBalance()
  const [activeTab, setActiveTab] = useState('transactions')
  const identifier = routeIdentifier ?? currentIdentity ?? ''
  const network: NetworkType = currentNetwork ?? 'testnet'
  const {
    balanceState,
    transactionsState,
    tokensState,
    namesState,
    rateState,
    refreshData
  } = useIdentityHomeData(identifier)

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
    if (isMasternodeIdentity && activeTab === 'names') {
      setActiveTab('transactions')
    }
  }, [isMasternodeIdentity, activeTab])

  const names = namesState.data ?? []
  const tokens = tokensState.data ?? []
  const transactions = transactionsState.data ?? []

  return (
    <div className='flex flex-col gap-6'>
      <IdentityBalance
        hide={hideBalance}
        loading={balanceState.loading}
        error={balanceState.error}
        credits={balanceState.data}
        rate={rateState.data}
        onToggleHide={toggleHide}
        onRefresh={() => { void refreshData() }}
      />
      {identifier !== '' && (
        <IdentityIdRow identifier={identifier} network={network} />
      )}
      <ActionRow scope='identity' identityId={identifier} />
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          {
            value: 'transactions',
            label: 'Transactions',
            content: (
              <TransactionsTab
                hide={hideBalance}
                loading={transactionsState.loading}
                error={transactionsState.error}
                transactions={transactions}
                rate={rateState.data}
                network={network}
                tokenCount={tokens.length}
                nameCount={names.length}
                lastName={names[0]?.name ?? null}
              />
            )
          },
          {
            value: 'tokens',
            label: 'Tokens',
            content: (
              <TokensTab
                hide={hideBalance}
                network={network}
                loading={tokensState.loading}
                error={tokensState.error}
                tokens={tokens}
                identityId={identifier}
              />
            )
          },
          {
            value: 'names',
            label: 'Names',
            disabled: isMasternodeIdentity,
            content: (
              <NamesTab
                loading={namesState.loading}
                error={namesState.error}
                names={names}
              />
            )
          }
        ]}
      />
    </div>
  )
}

export default withAccessControl(IdentityHomeState, { requireWallet: false })
