import React from 'react'
import { MenuSection } from '../MenuSection'
import type { SettingsScreenProps } from '../types'

export const WalletSettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onClose
}) => {
  const handleItemClick = (itemId: string): void => {
    console.log(`Wallet settings action: ${itemId}`)
    // TODO: Implement actions for each menu item
  }

  const sections = [
    {
      id: 'wallet-info',
      title: 'Wallet Information',
      items: [
        {
          id: 'view-seed',
          title: 'Show Seed Phrase'
        },
        {
          id: 'view-private-keys',
          title: 'Private Keys'
        }
      ]
    },
    {
      id: 'wallet-management',
      title: 'Wallet Management',
      items: [
        {
          id: 'rename-wallet',
          title: 'Rename Wallet'
        }
      ]
    },
    {
      id: 'danger-zone',
      title: 'Danger Zone',
      items: [
        {
          id: 'delete-wallet',
          title: 'Delete Wallet',
          disabled: false
        }
      ]
    }
  ]

  return (
    <div className='menu-sections-container'>
      {sections.map((section) => (
        <MenuSection
          key={section.id}
          section={section}
          onItemClick={handleItemClick}
        />
      ))}
    </div>
  )
}
