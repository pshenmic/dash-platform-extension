import React from 'react'
import { MenuSection } from '../MenuSection'
import type { SettingsScreenProps } from '../types'

// Menu icons based on Figma design
const WalletIcon: React.FC = () => (
  <svg width='24' height='24' viewBox='0 0 24 24' fill='none'>
    <rect x='2' y='6' width='20' height='12' rx='2' stroke='#4095BF' strokeWidth='1.5' />
    <path d='M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2' stroke='#4095BF' strokeWidth='1.5' />
    <circle cx='16' cy='12' r='1' fill='#4095BF' />
  </svg>
)

const PreferencesIcon: React.FC = () => (
  <svg width='15' height='15' viewBox='0 0 15 15' fill='none'>
    <path d='M7.5 4.5L9 3L12 6L10.5 7.5M7.5 4.5L3 9V12H6L10.5 7.5M7.5 4.5L10.5 7.5' stroke='#0C1C33' strokeWidth='1' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

const ConnectedDappsIcon: React.FC = () => (
  <svg width='15' height='11' viewBox='0 0 15 11' fill='none'>
    <path d='M1 5.5H14M5 1L1 5.5L5 10M10 1L14 5.5L10 10' stroke='#0C1C33' strokeWidth='1' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

const SecurityIcon: React.FC = () => (
  <svg width='14' height='15' viewBox='0 0 14 15' fill='none'>
    <path d='M7 1L12 3V8C12 11.5 9.5 14.5 7 15C4.5 14.5 2 11.5 2 8V3L7 1Z' stroke='#0C1C33' strokeWidth='1' />
    <path d='M5 8L6.5 9.5L9 7' stroke='#0C1C33' strokeWidth='1' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

const HelpIcon: React.FC = () => (
  <svg width='15' height='15' viewBox='0 0 15 15' fill='none'>
    <circle cx='7.5' cy='7.5' r='6.5' stroke='#0C1C33' strokeWidth='1' />
    <path d='M5.5 6a2 2 0 0 1 4 0c0 1-2 1.5-2 2.5' stroke='#0C1C33' strokeWidth='1' strokeLinecap='round' />
    <circle cx='7.5' cy='11' r='0.5' fill='#0C1C33' />
  </svg>
)

const DashIcon: React.FC = () => (
  <svg width='12' height='10' viewBox='0 0 12 10' fill='none'>
    <path d='M10.22 0H1.78L0 3.85H6.08L8.15 0H10.22Z' fill='#0C1C33' />
    <path d='M1.78 9.74H10.22L12 5.89H5.92L3.85 9.74H1.78Z' fill='#0C1C33' />
  </svg>
)

interface MainSettingsScreenProps extends SettingsScreenProps {
  onItemSelect: (itemId: string) => void
}

export const MainSettingsScreen: React.FC<MainSettingsScreenProps> = ({
  onItemSelect
}) => {
  // Account section with current wallet info
  const accountSection = {
    id: 'account',
    title: 'Account Settings',
    items: [
      {
        id: 'current-wallet',
        title: '6Eb4...p24c',
        description: 'Main_account',
        icon: <WalletIcon />,
        hasSubMenu: true
      }
    ]
  }

  // Global settings sections based on Figma design
  const globalSections = [
    {
      id: 'global-settings-1',
      title: 'Global Settings',
      items: [
        {
          id: 'preferences',
          title: 'Preferences',
          icon: <PreferencesIcon />,
          hasSubMenu: true
        },
        {
          id: 'connected-dapps',
          title: 'Connected dapps',
          icon: <ConnectedDappsIcon />,
          hasSubMenu: true
        },
        {
          id: 'security-privacy',
          title: 'Security & Privacy',
          icon: <SecurityIcon />,
          hasSubMenu: true
        }
      ]
    },
    {
      id: 'global-settings-2',
      title: '',
      items: [
        {
          id: 'help-support',
          title: 'Help and Support',
          icon: <HelpIcon />,
          hasSubMenu: true
        },
        {
          id: 'about-dash',
          title: 'About Dash Extension',
          icon: <DashIcon />,
          hasSubMenu: true
        }
      ]
    }
  ]

  const sections = [accountSection, ...globalSections]

  return (
    <div className='space-y-6'>
      {sections.map((section, index) => (
        <MenuSection
          key={section.id}
          section={section}
          onItemClick={onItemSelect}
          isAccount={index === 0}
        />
      ))}
    </div>
  )
}
