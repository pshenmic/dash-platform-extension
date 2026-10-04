import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Tabs } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import {
  useDashRate,
  useHideBalance,
  usePlatformAddresses,
  useShieldedAddresses,
  useWalletCapabilities,
  useWalletPlatformData
} from '../../hooks'
import type { OutletContext } from '../../types'
import type { NetworkType } from '../../../types'
import { toCreditsBigInt } from '../../../utils'
import { ActionRow } from '../home/ActionRow'
import { AddressesTab, type AddressType } from './AddressesTab'
import { BalanceBlock } from './BalanceBlock'
import { IdentitiesTab } from './IdentitiesTab'
import { OverviewTab } from './OverviewTab'
import { usePlatformOverview } from './usePlatformOverview'

/**
 * Platform layer home (Figma 10681:876). Balances, statistics and operations
 * come from the explorer.
 */
function PlatformHomeState (): React.JSX.Element {
  const { availableIdentities, currentNetwork, currentWallet, reloadIdentities } = useOutletContext<OutletContext>()
  const { hideBalance, toggleHide } = useHideBalance()
  const { hasAddressLayer } = useWalletCapabilities()
  const [activeTab, setActiveTab] = useState('overview')
  const [addressType, setAddressType] = useState<AddressType>('platform')
  const network: NetworkType = currentNetwork ?? 'testnet'
  const platformData = useWalletPlatformData(availableIdentities, network)
  const overview = usePlatformOverview(availableIdentities, network)
  const { rate, reload: reloadRate } = useDashRate(network)
  // Lives here, not in the tab: the balance block shares it and tab switches keep the data.
  const platform = usePlatformAddresses(network, currentWallet)
  // Shared by the balance slice and the Shield sub-tab.
  const shielded = useShieldedAddresses(network, currentWallet)
  const shieldedCredits = shielded.balance != null
    ? toCreditsBigInt(shielded.balance) ?? 0n
    : null

  // The shielded password is entered in the Shield sub-tab.
  const handleUnlockShielded = (): void => {
    setActiveTab('addresses')
    setAddressType('shield')
  }

  // A reload keeps the previous sum; only the first load has nothing to show.
  const identityCredits = platformData.loading && platformData.identities.length === 0
    ? null
    : platformData.totalCredits

  const handleRefresh = (): void => {
    reloadIdentities().catch(e => console.log('reloadIdentities error', e))
    platformData.reload()
    void platform.reload()
    void shielded.refresh()
    reloadRate()
    overview.reload()
  }

  return (
    <div className='flex flex-col gap-6'>
      <BalanceBlock
        hide={hideBalance}
        onToggleHide={toggleHide}
        onRefresh={handleRefresh}
        identityCredits={identityCredits}
        identitiesLoading={platformData.loading}
        platform={platform}
        shieldedCredits={shieldedCredits}
        shieldedSyncing={shielded.isSyncing}
        shieldedLoading={shielded.isRefreshing}
        onUnlockShielded={handleUnlockShielded}
        rate={rate}
        loading={platformData.loading || platform.isLoading || shielded.isRefreshing}
        hasAddressLayer={hasAddressLayer}
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
                platformData={platformData}
                overview={overview}
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
          ...(hasAddressLayer
            ? [{
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
              }]
            : [])
        ]}
      />
    </div>
  )
}

export default withAccessControl(PlatformHomeState, { requireWallet: false })
