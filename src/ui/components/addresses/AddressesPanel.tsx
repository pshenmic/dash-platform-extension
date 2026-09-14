import React, { useState } from 'react'
import { Tabs } from 'dash-ui-kit/react'
import { PlatformAddresses } from './PlatformAddresses'
import { ShieldedAddresses } from './ShieldedAddresses'
import type { NetworkType } from '../../../types'

interface AddressesPanelProps {
  walletId?: string | null
  currentNetwork?: NetworkType | null
}

export const AddressesPanel: React.FC<AddressesPanelProps> = ({ currentNetwork, walletId }) => {
  const [activeTab, setActiveTab] = useState('platform')

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      items={[
        {
          value: 'platform',
          label: 'Platform',
          content: <PlatformAddresses currentNetwork={currentNetwork} walletId={walletId} />
        },
        {
          value: 'shielded',
          label: 'Shielded',
          content: <ShieldedAddresses currentNetwork={currentNetwork} walletId={walletId} />
        }
      ]}
    />
  )
}
