import React from 'react'
import { MenuSection } from '../MenuSection'
import { KeyIcon} from 'dash-ui/react'
import type { SettingsScreenProps, ScreenConfig } from '../types'

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

// Export configurations for other screens
export const walletSettingsConfig: ScreenConfig = {
  id: 'current-wallet',
  title: 'Wallet Settings',
  icon: <WalletIcon />,
  category: 'account',
  order: 1,
  content: [] // WalletSettingsScreen will export its own content
}

export const preferencesConfig: ScreenConfig = {
  id: 'preferences',
  title: 'Preferences',
  icon: <PreferencesIcon />,
  category: 'wallet',
  order: 1,
  content: [] // Content will be imported from PreferencesScreen
}

export const connectedDappsConfig: ScreenConfig = {
  id: 'connected-dapps',
  title: 'Connected dapps',
  icon: <ConnectedDappsIcon />,
  category: 'wallet',
  order: 2,
  content: [] // ConnectedDappsScreen will export its own content
}

export const privateKeysConfig: ScreenConfig = {
  id: 'private-keys',
  title: 'Private Keys',
  icon: <KeyIcon className='text-dash-primary-dark-blue' />,
  category: 'wallet',
  order: 3,
  content: [] // A separate screen will be created or added to existing
}

export const securityPrivacyConfig: ScreenConfig = {
  id: 'security-privacy',
  title: 'Security & Privacy',
  icon: <SecurityIcon />,
  category: 'wallet',
  order: 4,
  content: [] // SecuritySettingsScreen will export its own content
}

export const helpSupportConfig: ScreenConfig = {
  id: 'help-support',
  title: 'Help and Support',
  icon: <HelpIcon />,
  category: 'other',
  order: 1,
  content: [] // HelpSupportScreen will export its own content
}

export const aboutDashConfig: ScreenConfig = {
  id: 'about-dash',
  title: 'About Dash Extension',
  icon: <DashIcon />,
  category: 'other',
  order: 2,
  content: [] // AboutScreen will export its own content
}

// Main screen configuration
export const mainScreenConfig: ScreenConfig = {
  id: 'main',
  title: 'Settings',
  category: 'account',
  order: 0,
  content: [
    {
      id: 'account',
      title: 'Account Settings',
      items: [
        {
          id: walletSettingsConfig.id,
          title: '6Eb4...p24c',
          description: 'Main_account',
          icon: walletSettingsConfig.icon,
          hasSubMenu: true
        }
      ]
    },
    {
      id: 'wallet-settings',
      title: 'Wallet Settings',
      items: [
        {
          id: preferencesConfig.id,
          title: preferencesConfig.title,
          icon: preferencesConfig.icon,
          hasSubMenu: true
        },
        {
          id: connectedDappsConfig.id,
          title: connectedDappsConfig.title,
          icon: connectedDappsConfig.icon,
          hasSubMenu: true
        },
        {
          id: privateKeysConfig.id,
          title: privateKeysConfig.title,
          icon: privateKeysConfig.icon,
          hasSubMenu: true
        },
        {
          id: securityPrivacyConfig.id,
          title: securityPrivacyConfig.title,
          icon: securityPrivacyConfig.icon,
          hasSubMenu: true
        }
      ]
    },
    {
      id: 'other',
      title: 'Other',
      items: [
        {
          id: helpSupportConfig.id,
          title: helpSupportConfig.title,
          icon: helpSupportConfig.icon,
          hasSubMenu: true
        },
        {
          id: aboutDashConfig.id,
          title: aboutDashConfig.title,
          icon: aboutDashConfig.icon,
          hasSubMenu: true
        }
      ]
    }
  ]
}

interface MainSettingsScreenProps extends SettingsScreenProps {
  onItemSelect: (itemId: string) => void
}

export const MainSettingsScreen: React.FC<MainSettingsScreenProps> = ({
  onItemSelect
}) => {
  return (
    <div className='space-y-6'>
      {mainScreenConfig.content.map((section, index) => (
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
