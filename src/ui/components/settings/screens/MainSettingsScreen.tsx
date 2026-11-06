import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MenuSection } from '../MenuSection'
import {
  KeyIcon,
  WalletIcon,
  ChainSmallIcon,
  DashLogo,
  QuestionMessageIcon,
  WebIcon,
  LockIcon
} from 'dash-ui-kit/react'
import { NetworkSelector } from '../../controls'
import { lockSession } from '../../../utils/lockSession'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import type { SettingsScreenProps, ScreenConfig, MenuSection as MenuSectionType } from '../types'
import { recoverAssetLockFundsScreenConfig } from './RecoverAssetLockFundsScreen'
import type { WalletAccountInfo } from '../../../../types/messages/response/GetAllWalletsResponse'
import type { NetworkType } from '../../../../types'

export const walletSettingsConfig: ScreenConfig = {
  id: 'current-wallet',
  title: 'Wallet Settings',
  icon: <WalletIcon className='text-dash-primary-dark-blue' />,
  category: 'account',
  content: []
}

export const connectedWebsitesConfig: ScreenConfig = {
  id: 'connected-websites',
  title: 'Connected Websites',
  icon: <ChainSmallIcon className='text-dash-primary-dark-blue' />,
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
  icon: <DashLogo className='!text-dash-primary-dark-blue' />,
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
          hasSubMenu: true
        },
        {
          id: 'about-dash-item',
          title: aboutDashConfig.title,
          icon: aboutDashConfig.icon,
          screenId: aboutDashConfig.id,
          hasSubMenu: true
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
  networkControl?: React.ReactNode,
  onLock?: () => void,
  hasRecoverableFunds: boolean = false
): ScreenConfig => {
  const isPrivateKeysDisabled = currentWallet == null || currentIdentity == null

  // Deposits stranded on funding addresses of a registration flow that no longer
  // exists. Offered only where there is something to recover: the entry is
  // meaningless otherwise, and most wallets never had one.
  const withRecovery = (sections: MenuSectionType[]): MenuSectionType[] => {
    if (!hasRecoverableFunds) {
      return sections
    }

    return sections.map(section => section.id === 'wallet-settings'
      ? {
          ...section,
          items: [
            ...section.items,
            {
              id: 'recover-asset-lock-funds-item',
              title: recoverAssetLockFundsScreenConfig.title,
              icon: recoverAssetLockFundsScreenConfig.icon,
              screenId: recoverAssetLockFundsScreenConfig.id,
              hasSubMenu: true
            }
          ]
        }
      : section)
  }

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
                icon: <WebIcon className='!text-dash-primary-dark-blue' />,
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
      ...withRecovery(mainScreenConfig.content),
      {
        id: 'lock-wallet',
        title: '',
        items: [
          {
            id: 'lock-wallet-item',
            title: 'Lock Wallet',
            icon: <LockIcon className='text-dash-primary-dark-blue' />,
            onAction: onLock
          }
        ]
      }
    ]
  }
}

export const MainSettingsScreen: React.FC<MainSettingsScreenProps> = ({
  onItemSelect,
  onClose,
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

  const navigate = useNavigate()

  const extensionAPI = useExtensionAPI()
  const [hasRecoverableFunds, setHasRecoverableFunds] = useState(false)

  // Storage-only listing, so opening settings does not fire an explorer request
  // per address. The menu only needs to know whether there is anything to show.
  useEffect(() => {
    let cancelled = false

    extensionAPI.listRecoverableAssetLockFunds()
      .then(addresses => {
        if (!cancelled) {
          setHasRecoverableFunds(addresses.length > 0)
        }
      })
      .catch((e) => {
        console.warn('Failed to check for recoverable asset lock funds:', e)
      })

    return () => {
      cancelled = true
    }
    // Entries are per (network, wallet), so switching either re-reads them.
  }, [extensionAPI, currentWallet, currentNetwork])

  // Drops the session marker, so the password is asked again.
  const handleLock = async (): Promise<void> => {
    await lockSession()
    onClose()
    void navigate('/login', { replace: true })
  }

  const dynamicConfig = createDynamicMainScreenConfig(currentWallet, currentIdentity, networkControl, () => {
    handleLock().catch(e => console.log('lock wallet error:', e))
  }, hasRecoverableFunds)

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
