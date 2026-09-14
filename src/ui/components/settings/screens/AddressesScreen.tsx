import React from 'react'
import { AddressesPanel } from '../../addresses'
import type { SettingsScreenProps } from '../types'

export const AddressesScreen: React.FC<SettingsScreenProps> = ({ currentNetwork, currentWallet }) => {
  return <AddressesPanel currentNetwork={currentNetwork} walletId={currentWallet?.walletId ?? null} />
}
