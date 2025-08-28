import React, { useState } from 'react'
import { OverlayMenu } from './OverlayMenu'
import { MainSettingsScreen } from './screens/MainSettingsScreen'
import { WalletSettingsScreen } from './screens/WalletSettingsScreen'
import { PreferencesScreen } from './screens/PreferencesScreen'
import { ConnectedDappsScreen } from './screens/ConnectedDappsScreen'
import { PrivateKeysScreen } from './screens/PrivateKeysScreen'
import { ImportPrivateKeysScreen } from './screens/ImportPrivateKeysScreen'
import { SecuritySettingsScreen } from './screens/SecuritySettingsScreen'
import { HelpSupportScreen } from './screens/HelpSupportScreen'
import { AboutScreen } from './screens/AboutScreen'
import { MenuSection } from './MenuSection'
import { screenConfigs } from './screens/configs'
import type { MenuSection as MenuSectionType, SettingsScreenProps } from './types'
import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'

type ScreenType = 'main' | 'current-wallet' | 'preferences' | 'connected-dapps' | 'private-keys' | 'import-private-keys-settings' | 'security-privacy' | 'help-support' | 'about-dash'

// Screen component mappings
const SCREEN_COMPONENTS: Record<string, React.ComponentType<SettingsScreenProps>> = {
  'current-wallet': WalletSettingsScreen,
  preferences: PreferencesScreen,
  'connected-dapps': ConnectedDappsScreen,
  'private-keys': PrivateKeysScreen,
  'import-private-keys-settings': ImportPrivateKeysScreen,
  'security-privacy': SecuritySettingsScreen,
  'help-support': HelpSupportScreen,
  'about-dash': AboutScreen
}

// Universal screen renderer based on ScreenConfig content
const ScreenRenderer: React.FC<SettingsScreenProps & { screenType: ScreenType; selectedNetwork?: string | null }> = ({
  screenType,
  onBack,
  onClose,
  currentIdentity,
  selectedNetwork,
  currentWallet,
  onItemSelect
}) => {
  const screenConfig = screenConfigs[screenType]

  if (screenConfig === null || screenConfig === undefined) {
    return <div>Screen not found</div>
  }

  // Special case for main screen - use the existing component
  if (screenType === 'main') {
    return (
      <MainSettingsScreen
        onBack={onBack}
        onClose={onClose}
        currentIdentity={currentIdentity}
        selectedNetwork={selectedNetwork}
        currentWallet={currentWallet}
        onItemSelect={onItemSelect ?? (() => {})}
      />
    )
  }

  // Try to find a dedicated screen component
  const ScreenComponent = SCREEN_COMPONENTS[screenType]
  if (ScreenComponent !== null && ScreenComponent !== undefined) {
    return (
      <ScreenComponent
        onBack={onBack}
        onClose={onClose}
        currentIdentity={currentIdentity}
        selectedNetwork={selectedNetwork}
        currentWallet={currentWallet}
        onItemSelect={onItemSelect}
      />
    )
  }

  // Fallback: render MenuSection array from config
  const sections = screenConfig.content
  const handleItemClick = (itemId: string): void => {
    console.log(`Screen ${screenType} action: ${itemId}`)
    // TODO: Implement actions for each menu item
  }

  return (
    <div className='space-y-6'>
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

interface SettingsMenuProps {
  isOpen: boolean
  onClose: () => void
  currentIdentity?: string | null
  selectedNetwork?: string | null
  currentWallet?: WalletAccountInfo | null
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, currentIdentity, selectedNetwork, currentWallet }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('main')
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(['main'])

  const navigateToScreen = (itemIdOrScreenId: string): void => {
    if (itemIdOrScreenId === 'logout') {
      // Special case for logout
      handleLogout()
      return
    }

    // Check if this is a direct screen ID
    if (screenConfigs[itemIdOrScreenId as ScreenType] !== null && screenConfigs[itemIdOrScreenId as ScreenType] !== undefined) {
      const screenType = itemIdOrScreenId as ScreenType
      setCurrentScreen(screenType)
      setScreenHistory(prev => [...prev, screenType])
      return
    }

    // Find the menu item by ID and get its screenId
    const findMenuItem = (sections: MenuSectionType[]): string | undefined => {
      for (const section of sections) {
        const item = section.items.find(item => item.id === itemIdOrScreenId)
        if (item?.screenId !== null && item?.screenId !== undefined && item?.screenId !== '') {
          return item.screenId
        }
      }
      return undefined
    }

    // Look for the item in main screen config
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
    // Reset state on close
    setCurrentScreen('main')
    setScreenHistory(['main'])
    onClose()
  }

  const handleLogout = (): void => {
    // TODO: Implement logout logic
    console.log('Logout requested')
    handleClose()
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
        selectedNetwork={selectedNetwork}
        currentWallet={currentWallet}
        onItemSelect={navigateToScreen}
      />
    </OverlayMenu>
  )
}
