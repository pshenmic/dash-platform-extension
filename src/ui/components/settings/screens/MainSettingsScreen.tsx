import React from 'react'
import { MenuSection } from '../MenuSection'
import {
  KeyIcon,
  WalletIcon,
  ShieldSmallIcon,
  ChainSmallIcon,
  SettingsIcon,
  DashLogo,
  QuestionMessageIcon,
  Identifier,
  Avatar
} from 'dash-ui/react'
import type { SettingsScreenProps, ScreenConfig, MenuSection as MenuSectionType } from '../types'

// Export configurations for other screens
export const walletSettingsConfig: ScreenConfig = {
  id: 'current-wallet',
  title: 'Wallet Settings',
  icon: <WalletIcon className='text-dash-primary-dark-blue'/>,
  category: 'account',
  content: []
}

export const preferencesConfig: ScreenConfig = {
  id: 'preferences',
  title: 'Preferences',
  icon: <SettingsIcon className='text-dash-primary-dark-blue'/>,
  category: 'wallet',
  content: []
}

export const connectedDappsConfig: ScreenConfig = {
  id: 'connected-dapps',
  title: 'Connected dapps',
  icon: <ChainSmallIcon className='text-dash-primary-dark-blue'/>,
  category: 'wallet',
  content: []
}

export const privateKeysConfig: ScreenConfig = {
  id: 'private-keys',
  title: 'Private Keys',
  icon: <KeyIcon className='text-dash-primary-dark-blue' />,
  category: 'wallet',
  content: []
}

export const securityPrivacyConfig: ScreenConfig = {
  id: 'security-privacy',
  title: 'Security & Privacy',
  icon: <ShieldSmallIcon className='text-dash-primary-dark-blue' />,
  category: 'wallet',
  content: []
}

export const helpSupportConfig: ScreenConfig = {
  id: 'help-support',
  title: 'Help and Support',
  icon: <QuestionMessageIcon className='text-dash-primary-dark-blue' />,
  category: 'other',
  content: []
}

export const aboutDashConfig: ScreenConfig = {
  id: 'about-dash',
  title: 'About Dash Extension',
  icon: <DashLogo className='!text-dash-primary-dark-blue w-4 h-4' />,
  category: 'other',
  content: []
}

// Main screen configuration
export const mainScreenConfig: ScreenConfig = {
  id: 'main',
  title: 'Settings',
  category: 'account',
  content: [
    {
      id: 'wallet-settings',
      title: 'Wallet Settings',
      items: [
        {
          id: 'preferences-item',
          title: preferencesConfig.title,
          icon: preferencesConfig.icon,
          screenId: preferencesConfig.id,
          hasSubMenu: true,
          disabled: true
        },
        {
          id: 'connected-dapps-item',
          title: connectedDappsConfig.title,
          icon: connectedDappsConfig.icon,
          screenId: connectedDappsConfig.id,
          hasSubMenu: true,
          disabled: true
        },
        {
          id: 'private-keys-item',
          title: privateKeysConfig.title,
          icon: privateKeysConfig.icon,
          screenId: privateKeysConfig.id,
          hasSubMenu: true,
        },
        {
          id: 'security-privacy-item',
          title: securityPrivacyConfig.title,
          icon: securityPrivacyConfig.icon,
          screenId: securityPrivacyConfig.id,
          hasSubMenu: true,
          disabled: true
        }
      ]
    },
    {
      id: 'other',
      title: 'Other',
      items: [
        {
          id: 'help-support-item',
          title: helpSupportConfig.title,
          icon: helpSupportConfig.icon,
          screenId: helpSupportConfig.id,
          hasSubMenu: true,
          disabled: true
        },
        {
          id: 'about-dash-item',
          title: aboutDashConfig.title,
          icon: aboutDashConfig.icon,
          screenId: aboutDashConfig.id,
          hasSubMenu: true,
          disabled: true
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
  // Generate dynamic configuration with real currentIdentity
  const dynamicMainScreenConfig: ScreenConfig = {
    ...mainScreenConfig,
    content: [
      {
        id: 'account',
        title: 'Account Settings',
        items: [
          {
            id: 'current-wallet-item',
            title: currentIdentity ? (
              <Identifier 
                middleEllipsis 
                edgeChars={4} 
              >
                {currentIdentity}
              </Identifier>
            ) : 'No Identity',
            icon: currentIdentity ? (
              <Avatar size='sm' username={currentIdentity} />
            ) : walletSettingsConfig.icon,
            screenId: walletSettingsConfig.id,
            hasSubMenu: true,
            disabled: true
          }
        ]
      },
      ...(mainScreenConfig.content as MenuSectionType[]) // Keep the rest of the sections unchanged
    ]
  }

  return (
    <div className='space-y-6'>
      {(dynamicMainScreenConfig.content as MenuSectionType[]).map((section, index) => (
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
