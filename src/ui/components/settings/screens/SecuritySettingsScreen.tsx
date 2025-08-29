import React from 'react'
import { MenuSection } from '../MenuSection'
import type { SettingsScreenProps } from '../types'

const KeyIcon: React.FC = () => (
  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
    <path d='M15.8333 6.66667C15.8333 9.42811 13.5948 11.6667 10.8333 11.6667C8.07187 11.6667 5.83333 9.42811 5.83333 6.66667C5.83333 3.90524 8.07187 1.66667 10.8333 1.66667C13.5948 1.66667 15.8333 3.90524 15.8333 6.66667Z' stroke='currentColor' strokeWidth='1.5' />
    <path d='M7.04167 10.5417L2.5 15.0833V18.3333H5.75L10.2917 13.7917' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

const FingerprintIcon: React.FC = () => (
  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
    <path d='M5.83333 11.6667C5.83333 9.36553 7.69881 7.5 10 7.5C12.3012 7.5 14.1667 9.36553 14.1667 11.6667M7.5 11.6667C7.5 10.2859 8.61929 9.16667 10 9.16667C11.3807 9.16667 12.5 10.2859 12.5 11.6667M10 11.6667V15M5.83333 15V11.6667C5.83333 8.44501 8.44501 5.83333 11.6667 5.83333M4.16667 15V11.6667C4.16667 7.52441 7.52441 4.16667 11.6667 4.16667' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

export const SecuritySettingsScreen: React.FC<SettingsScreenProps> = () => {
  const handleItemClick = (itemId: string): void => {
    console.log(`Security settings action: ${itemId}`)
    // TODO: Implement actions for each menu item
  }

  const sections = [
    {
      id: 'password',
      title: 'Password & Authentication',
      items: [
        {
          id: 'change-password',
          title: 'Change Password',
          icon: <KeyIcon />
        },
        {
          id: 'biometric-auth',
          title: 'Biometric Authentication',
          icon: <FingerprintIcon />
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
