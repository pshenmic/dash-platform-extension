import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Tabs, Text } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useHideBalance } from '../../hooks'
import type { OutletContext } from '../../types/OutletContext'
import { ActionRow } from '../home/ActionRow'
import { AddressesTab } from './AddressesTab'
import { BalanceBlock } from './BalanceBlock'
import { IdentitiesTab } from './IdentitiesTab'
import { OverviewTab } from './OverviewTab'

function TabStub ({ label }: { label: string }): React.JSX.Element {
  return (
    <Text size='sm' dim>
      {label} tab — mock only. Live lists land with Platform v2.
    </Text>
  )
}

/**
 * Platform layer home (Figma 10681:876). Mock balances / ops until explorer + credits APIs wire in.
 */
function PlatformHomeState (): React.JSX.Element {
  const { availableIdentities } = useOutletContext<OutletContext>()
  const { hideBalance, toggleHide, refresh } = useHideBalance()
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className='flex flex-col gap-6'>
      <BalanceBlock hide={hideBalance} onToggleHide={toggleHide} onRefresh={refresh} />
      <ActionRow scope='platform' />
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          {
            value: 'overview',
            label: 'Overview',
            content: (
              <OverviewTab hide={hideBalance} identityCount={availableIdentities.length} />
            )
          },
          {
            value: 'identities',
            label: 'Identities',
            content: (
              <IdentitiesTab hide={hideBalance} identities={availableIdentities} />
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
