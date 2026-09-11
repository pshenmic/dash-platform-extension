import React from 'react'
import { MenuSection } from '../MenuSection'
import {
  KeyIcon,
  WalletIcon,
  ShieldSmallIcon,
  ChainSmallIcon,
  CreditsIcon,
  SettingsIcon,
  DashLogo,
  QuestionMessageIcon,
  WebIcon
} from 'dash-ui-kit/react'
import { NetworkSelector } from '../../controls'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import type { WalletAccountInfo } from '../../../../types/messages/response/GetAllWalletsResponse'
import type { NetworkType } from '../../../../types'

export const walletSettingsConfig: ScreenConfig = {
  id: 'current-wallet',
  title: 'Wallet Settings',
  icon: <WalletIcon className='text-dash-primary-dark-blue' />,
  category: 'account',
  content: []
}

export const preferencesConfig: ScreenConfig = {
  id: 'preferences',
  title: 'Preferences',
  icon: <SettingsIcon className='text-dash-primary-dark-blue' />,
  category: 'wallet',
  content: []
}

export const connectedWebsitesConfig: ScreenConfig = {
  id: 'connected-websites',
  title: 'Connected Websites',
  icon: <ChainSmallIcon className='text-dash-primary-dark-blue' />,
  category: 'wallet',
  content: []
}

export const platformAddressesConfig: ScreenConfig = {
  id: 'platform-addresses',
  title: 'Addresses',
  icon: <CreditsIcon className='text-dash-primary-dark-blue' />,
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
          id: 'connected-websites-item',
          title: connectedWebsitesConfig.title,
          icon: connectedWebsitesConfig.icon,
          screenId: connectedWebsitesConfig.id,
          hasSubMenu: true
        },
        {
          id: 'platform-addresses-item',
          title: platformAddressesConfig.title,
          icon: platformAddressesConfig.icon,
          screenId: platformAddressesConfig.id,
          hasSubMenu: true
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
          id: 'preferences-item',
          title: preferencesConfig.title,
          icon: preferencesConfig.icon,
          screenId: preferencesConfig.id,
          hasSubMenu: true,
          disabled: true
        },
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

const createDynamicMainScreenConfig = (
  currentWallet?: WalletAccountInfo | null,
  currentIdentity?: string | null,
  networkControl?: React.ReactNode
): ScreenConfig => {
  const isPrivateKeysDisabled = currentWallet == null || currentIdentity == null

  return {
    ...mainScreenConfig,
    content: [
      ...(networkControl != null
        ? [{
            id: 'network',
            title: 'Network',
            items: [
              {
                id: 'network-item',
                title: 'Network',
                icon: <WebIcon size={16} className='!text-dash-primary-dark-blue' />,
                control: networkControl
              }
            ]
          }]
        : []),
      {
        id: 'identity-settings',
        title: 'Identity Settings',
        items: [
          {
            id: 'private-keys',
            title: privateKeysConfig.title,
            icon: privateKeysConfig.icon,
            screenId: privateKeysConfig.id,
            hasSubMenu: true,
            disabled: isPrivateKeysDisabled
          }
        ]
      },
      ...mainScreenConfig.content
    ]
  }
}

export const MainSettingsScreen: React.FC<MainSettingsScreenProps> = ({
  onItemSelect,
  currentWallet,
  currentIdentity,
  currentNetwork,
  setCurrentNetwork
}) => {
  const networkControl = setCurrentNetwork != null
    ? (
      <NetworkSelector
        currentNetwork={currentNetwork ?? undefined}
        onSelect={(network) => {
          if (network === currentNetwork) return
          void setCurrentNetwork(network as NetworkType)
        }}
      />
      )
    : undefined

  const dynamicConfig = createDynamicMainScreenConfig(currentWallet, currentIdentity, networkControl)

  return (
    <div className='menu-sections-container'>
      {dynamicConfig.content.map((section, index) => (
        <MenuSection
          key={section.id}
          section={section}
          onItemClick={onItemSelect}
        />
      ))}
    </div>
  )
}
