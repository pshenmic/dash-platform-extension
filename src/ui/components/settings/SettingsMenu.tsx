import React, { useState } from 'react'
import { OverlayMenu } from '../common'
import { MainSettingsScreen } from './screens/MainSettingsScreen'
import { WalletSettingsScreen } from './screens/WalletSettingsScreen'
import { PreferencesScreen } from './screens/PreferencesScreen'
import { ConnectedWebsitesScreen } from './screens/ConnectedWebsitesScreen'
import { PrivateKeysScreen } from './screens/PrivateKeysScreen'
import { ImportPrivateKeysScreen } from './screens/ImportPrivateKeysScreen'
import { SecuritySettingsScreen } from './screens/SecuritySettingsScreen'
import { HelpSupportScreen } from './screens/HelpSupportScreen'
import { AboutScreen } from './screens/AboutScreen'
import { MenuSection } from './MenuSection'
import { screenConfigs } from './screens/configs'
import type { MenuSection as MenuSectionType, SettingsScreenProps } from './types'
import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'

type ScreenType = 'main' | 'current-wallet' | 'preferences' | 'connected-websites' | 'private-keys' | 'import-private-keys-settings' | 'security-privacy' | 'help-support' | 'about-dash'

const SCREEN_COMPONENTS: Record<string, React.ComponentType<SettingsScreenProps>> = {
  'current-wallet': WalletSettingsScreen,
  preferences: PreferencesScreen,
  'connected-websites': ConnectedWebsitesScreen,
  'private-keys': PrivateKeysScreen,
  'import-private-keys-settings': ImportPrivateKeysScreen,
  'security-privacy': SecuritySettingsScreen,
  'help-support': HelpSupportScreen,
  'about-dash': AboutScreen
}

const ScreenRenderer: React.FC<SettingsScreenProps & { screenType: ScreenType, currentNetwork?: string | null }> = ({
  screenType,
  onBack,
  onClose,
  currentIdentity,
  currentNetwork,
  currentWallet,
  onItemSelect
}) => {
  const screenConfig = screenConfigs[screenType]

  if (screenConfig === null || screenConfig === undefined) {
    return <div>Screen not found</div>
  }

  if (screenType === 'main') {
    return (
      <MainSettingsScreen
        onBack={onBack}
        onClose={onClose}
        currentIdentity={currentIdentity}
        currentNetwork={currentNetwork}
        currentWallet={currentWallet}
        onItemSelect={onItemSelect ?? (() => {})}
      />
    )
  }

  const ScreenComponent = SCREEN_COMPONENTS[screenType]
  if (ScreenComponent !== null && ScreenComponent !== undefined) {
    return (
      <ScreenComponent
        onBack={onBack}
        onClose={onClose}
        currentIdentity={currentIdentity}
        currentNetwork={currentNetwork}
        currentWallet={currentWallet}
        onItemSelect={onItemSelect}
      />
    )
  }

  const sections = screenConfig.content

  return (
    <div className='menu-sections-container'>
      {sections.map((section) => (
        <MenuSection
          key={section.id}
          section={section}
          onItemClick={onItemSelect ?? (() => {})}
        />
      ))}
    </div>
  )
}

interface SettingsMenuProps {
  isOpen: boolean
  onClose: () => void
  currentIdentity?: string | null
  currentNetwork?: string | null
  currentWallet?: WalletAccountInfo | null
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, currentIdentity, currentNetwork, currentWallet }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('main')
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(['main'])

  const navigateToScreen = (itemIdOrScreenId: string): void => {
    if (screenConfigs[itemIdOrScreenId as ScreenType] !== null && screenConfigs[itemIdOrScreenId as ScreenType] !== undefined) {
      const screenType = itemIdOrScreenId as ScreenType
      setCurrentScreen(screenType)
      setScreenHistory(prev => [...prev, screenType])
      return
    }

    const findMenuItem = (sections: MenuSectionType[]): string | undefined => {
      for (const section of sections) {
        const item = section.items.find(item => item.id === itemIdOrScreenId)
        if (item?.screenId !== null && item?.screenId !== undefined && item?.screenId !== '') {
          return item.screenId
        }
      }
      return undefined
    }

    const mainConfig = screenConfigs.main
    if (mainConfig !== null && mainConfig !== undefined) {
      const screenId = findMenuItem(mainConfig.content)
      if (screenId !== null && screenId !== undefined && screenId !== '') {
        const screenType = screenId as ScreenType
        if (screenConfigs[screenType] !== null && screenConfigs[screenType] !== undefined) {
          setCurrentScreen(screenType)
          setScreenHistory(prev => [...prev, screenType])
        }
      }
    }
  }

  const navigateBack = (): void => {
    if (screenHistory.length > 1) {
      const newHistory = screenHistory.slice(0, -1)
      setScreenHistory(newHistory)
      setCurrentScreen(newHistory[newHistory.length - 1])
    }
  }

  const handleClose = (): void => {
    setCurrentScreen('main')
    setScreenHistory(['main'])
    onClose()
  }

  const currentScreenConfig = screenConfigs[currentScreen]

  return (
    <OverlayMenu
      isOpen={isOpen}
      onClose={handleClose}
      title={currentScreenConfig?.title ?? 'Settings'}
      showBackButton={currentScreen !== 'main'}
      onBack={currentScreen !== 'main' ? navigateBack : undefined}
    >
      <ScreenRenderer
        screenType={currentScreen}
        onBack={navigateBack}
        onClose={handleClose}
        currentIdentity={currentIdentity}
        currentNetwork={currentNetwork}
        currentWallet={currentWallet}
        onItemSelect={navigateToScreen}
      />
    </OverlayMenu>
  )
}
