import React from 'react'
import { MenuSection } from '../MenuSection'
import type { SettingsScreenProps } from '../types'

const EditIcon: React.FC = () => (
  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
    <path d='M14.1667 2.5C14.3856 2.28113 14.6454 2.10752 14.9314 1.98906C15.2173 1.87061 15.5239 1.80952 15.8333 1.80952C16.1428 1.80952 16.4493 1.87061 16.7353 1.98906C17.0212 2.10752 17.281 2.28113 17.5 2.5C17.7189 2.71887 17.8925 2.97869 18.0109 3.26464C18.1294 3.55059 18.1905 3.85719 18.1905 4.16667C18.1905 4.47615 18.1294 4.78275 18.0109 5.0687C17.8925 5.35464 17.7189 5.61446 17.5 5.83333L6.25 17.0833L1.66667 18.3333L2.91667 13.75L14.1667 2.5Z' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

const DeleteIcon: React.FC = () => (
  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
    <path d='M2.5 5H4.16667M4.16667 5H17.5M4.16667 5V16.6667C4.16667 17.1087 4.34226 17.5326 4.65482 17.8452C4.96738 18.1577 5.39131 18.3333 5.83333 18.3333H14.1667C14.6087 18.3333 15.0326 18.1577 15.3452 17.8452C15.6577 17.5326 15.8333 17.1087 15.8333 16.6667V5M6.66667 5V3.33333C6.66667 2.89131 6.84226 2.46738 7.15482 2.15482C7.46738 1.84226 7.89131 1.66667 8.33333 1.66667H11.6667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

const ViewIcon: React.FC = () => (
  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
    <path d='M1.25 10S4.58333 3.75 10 3.75S18.75 10 18.75 10S15.4167 16.25 10 16.25S1.25 10 1.25 10Z' stroke='currentColor' strokeWidth='1.5' />
    <path d='M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z' stroke='currentColor' strokeWidth='1.5' />
  </svg>
)

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
          title: 'Show Seed Phrase',
          icon: <ViewIcon />
        },
        {
          id: 'view-private-keys',
          title: 'Private Keys',
          icon: <ViewIcon />
        }
      ]
    },
    {
      id: 'wallet-management',
      title: 'Wallet Management',
      items: [
        {
          id: 'rename-wallet',
          title: 'Rename Wallet',
          icon: <EditIcon />
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
          icon: <DeleteIcon />,
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
