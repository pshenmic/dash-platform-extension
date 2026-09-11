import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Tabs } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import {
  useDashRate,
  useHideBalance,
  usePlatformAddresses,
  useShieldedAddresses,
  useWalletPlatformData
} from '../../hooks'
import type { OutletContext } from '../../types/OutletContext'
import type { NetworkType } from '../../../types'
import { toCreditsBigInt } from '../../../utils'
import { ActionRow } from '../home/ActionRow'
import { AddressesTab, type AddressType } from './AddressesTab'
import { BalanceBlock } from './BalanceBlock'
import { IdentitiesTab } from './IdentitiesTab'
import { OverviewTab } from './OverviewTab'

/**
 * Platform layer home (Figma 10681:876). Balances, statistics and operations
 * come from the explorer.
 */
function PlatformHomeState (): React.JSX.Element {
  const { availableIdentities, currentNetwork, currentWallet } = useOutletContext<OutletContext>()
  const { hideBalance, toggleHide, refresh } = useHideBalance()
  const [activeTab, setActiveTab] = useState('overview')
  const [addressType, setAddressType] = useState<AddressType>('platform')
  const network: NetworkType = currentNetwork ?? 'testnet'
  const platformData = useWalletPlatformData(availableIdentities, network)
  const rate = useDashRate(network)
  // One source of platform addresses for the whole dashboard: the balance block
  // and the Addresses tab share it, so switching tabs does not refetch.
  const platform = usePlatformAddresses(network, currentWallet)
  // One password unlocks both halves of the shielded data: the balance slice in
  // the block above and the rows in the Shield sub-tab.
  const shielded = useShieldedAddresses(network, currentWallet)
  const shieldedCredits = shielded.balance != null
    ? toCreditsBigInt(shielded.balance.balance) ?? 0n
    : null

  // The shielded password is entered in the Shield sub-tab, so Unlock just
  // takes the user there.
  const handleUnlockShielded = (): void => {
    setActiveTab('addresses')
    setAddressType('shield')
  }

  const handleRefresh = (): void => {
    refresh()
    platformData.reload()
    void platform.reload()
  }

  return (
    <div className='flex flex-col gap-6'>
      <BalanceBlock
        hide={hideBalance}
        onToggleHide={toggleHide}
        onRefresh={handleRefresh}
        identityCredits={platformData.loading ? null : platformData.totalCredits}
        platform={platform}
        shieldedCredits={shieldedCredits}
        onUnlockShielded={handleUnlockShielded}
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
            content: (
              <AddressesTab
                hide={hideBalance}
                platform={platform}
                shielded={shielded}
                addressType={addressType}
                onAddressTypeChange={setAddressType}
              />
            )
          }
        ]}
      />
    </div>
  )
}

export default withAccessControl(PlatformHomeState, { requireWallet: false })
