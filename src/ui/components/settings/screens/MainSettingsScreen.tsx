import React from 'react'
import { MenuSection } from '../MenuSection'
import {
  KeyIcon,
  WalletIcon,
  ShieldSmallIcon,
  ChainSmallIcon,
  SettingsIcon,
  DashLogo,
  QuestionMessageIcon
} from 'dash-ui/react'

import type { SettingsScreenProps, ScreenConfig } from '../types'

// Export configurations for other screens
export const walletSettingsConfig: ScreenConfig = {
  id: 'current-wallet',
  title: 'Wallet Settings',
  icon: <WalletIcon className='text-dash-primary-dark-blue'/>,
  category: 'account',
  order: 1,
  content: [] // WalletSettingsScreen will export its own content
}

export const preferencesConfig: ScreenConfig = {
  id: 'preferences',
  title: 'Preferences',
  icon: <SettingsIcon className='text-dash-primary-dark-blue'/>,
  category: 'wallet',
  order: 1,
  content: [] // Content will be imported from PreferencesScreen
}

export const connectedDappsConfig: ScreenConfig = {
  id: 'connected-dapps',
  title: 'Connected dapps',
  icon: <ChainSmallIcon className='text-dash-primary-dark-blue'/>,
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
  icon: <ShieldSmallIcon className='text-dash-primary-dark-blue' />,
  category: 'wallet',
  order: 4,
  content: [] // SecuritySettingsScreen will export its own content
}

export const helpSupportConfig: ScreenConfig = {
  id: 'help-support',
  title: 'Help and Support',
  icon: <QuestionMessageIcon className='text-dash-primary-dark-blue' />,
  category: 'other',
  order: 1,
  content: [] // HelpSupportScreen will export its own content
}

export const aboutDashConfig: ScreenConfig = {
  id: 'about-dash',
  title: 'About Dash Extension',
  icon: <DashLogo className='text-dash-primary-dark-blue' />,
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
  onItemSelect,
  currentIdentity
}) => {
  // Format currentIdentity for display (first 4 and last 4 characters)
  const formatIdentifier = (identifier: string | null): string => {
    if (!identifier) return 'No Identity'
    if (identifier.length <= 8) return identifier
    return `${identifier.slice(0, 4)}...${identifier.slice(-4)}`
  }

  // Generate dynamic configuration with real currentIdentity
  const dynamicMainScreenConfig: ScreenConfig = {
    ...mainScreenConfig,
    content: [
      {
        id: 'account',
        title: 'Account Settings',
        items: [
          {
            id: walletSettingsConfig.id,
            title: formatIdentifier(currentIdentity ?? null),
            description: 'Main_account',
            icon: walletSettingsConfig.icon,
            hasSubMenu: true
          }
        ]
      },
      ...mainScreenConfig.content.slice(1) // Keep the rest of the sections unchanged
    ]
  }

  return (
    <div className='space-y-6'>
      {dynamicMainScreenConfig.content.map((section, index) => (
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
