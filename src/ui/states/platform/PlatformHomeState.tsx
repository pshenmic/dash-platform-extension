import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Tabs, Text } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useDashRate, useHideBalance, useWalletPlatformData } from '../../hooks'
import type { OutletContext } from '../../types/OutletContext'
import type { NetworkType } from '../../../types'
import { ActionRow } from '../home/ActionRow'
import { AddressesTab } from './AddressesTab'
import { BalanceBlock } from './BalanceBlock'
import { IdentitiesTab } from './IdentitiesTab'
import { OverviewTab } from './OverviewTab'

function TabStub ({ label }: { label: string }): React.JSX.Element {
  return (
    <Text size='sm' dim>
      {label} list is not wired to the explorer yet.
    </Text>
  )
}

/**
 * Platform layer home (Figma 10681:876). Balances, statistics and operations
 * come from the explorer; the Tokens tab is still a stub.
 */
function PlatformHomeState (): React.JSX.Element {
  const { availableIdentities, currentNetwork } = useOutletContext<OutletContext>()
  const { hideBalance, toggleHide, refresh } = useHideBalance()
  const [activeTab, setActiveTab] = useState('overview')
  const network: NetworkType = currentNetwork ?? 'testnet'
  const platformData = useWalletPlatformData(availableIdentities, network)
  const rate = useDashRate(network)

  const handleRefresh = (): void => {
    refresh()
    platformData.reload()
  }

  return (
    <div className='flex flex-col gap-6'>
      <BalanceBlock
        hide={hideBalance}
        onToggleHide={toggleHide}
        onRefresh={handleRefresh}
        identityCredits={platformData.loading ? null : platformData.totalCredits}
        rate={rate}
        loading={platformData.loading}
      />
      <ActionRow scope='platform' />
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          {
            value: 'overview',
            label: 'Overview',
            content: (
              <OverviewTab
                hide={hideBalance}
                identities={availableIdentities}
                network={network}
                platformData={platformData}
                rate={rate}
              />
            )
          },
          {
            value: 'identities',
            label: 'Identities',
            content: (
              <IdentitiesTab hide={hideBalance} identities={availableIdentities} platformData={platformData} />
            )
          },
          {
            value: 'addresses',
            label: 'Addresses',
            content: <AddressesTab hide={hideBalance} />
          },
          {
            value: 'tokens',
            label: 'Tokens',
            content: <TabStub label='Tokens' />
          }
        ]}
      />
    </div>
  )
}

export default withAccessControl(PlatformHomeState, { requireWallet: false })
