import React, { useState } from 'react'
import { OverlayMenu } from './OverlayMenu'
import { MainSettingsScreen } from './screens/MainSettingsScreen'
import { WalletSettingsScreen } from './screens/WalletSettingsScreen'
import { SecuritySettingsScreen } from './screens/SecuritySettingsScreen'
import { PreferencesScreen } from './screens/PreferencesScreen'
import { ConnectedDappsScreen } from './screens/ConnectedDappsScreen'
import { HelpSupportScreen } from './screens/HelpSupportScreen'
import { AboutScreen } from './screens/AboutScreen'
import { PrivateKeysScreen } from './screens/PrivateKeysScreen'
import { screenConfigs } from './screens/configs'

type ScreenType = 'main' | 'current-wallet' | 'preferences' | 'connected-dapps' | 'private-keys' | 'security-privacy' | 'help-support' | 'about-dash'

interface ScreenComponentConfig {
  component: React.ComponentType<any>
}

const SCREEN_COMPONENTS: Record<ScreenType, ScreenComponentConfig> = {
  main: {
    component: MainSettingsScreen
  },
  'current-wallet': {
    component: WalletSettingsScreen
  },
  preferences: {
    component: PreferencesScreen
  },
  'connected-dapps': {
    component: ConnectedDappsScreen
  },
  'private-keys': {
    component: PrivateKeysScreen
  },
  'security-privacy': {
    component: SecuritySettingsScreen
  },
  'help-support': {
    component: HelpSupportScreen
  },
  'about-dash': {
    component: AboutScreen
  }
}

interface SettingsMenuProps {
  isOpen: boolean
  onClose: () => void
  currentIdentity?: string | null
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, currentIdentity }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('main')
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(['main'])

  const navigateToScreen = (screenId: string): void => {
    if (screenId === 'logout') {
      // Special case for logout
      handleLogout()
      return
    }

    const screenType = screenId as ScreenType
    if (SCREEN_COMPONENTS[screenType] && screenConfigs[screenType]) {
      setCurrentScreen(screenType)
      setScreenHistory(prev => [...prev, screenType])
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
  const CurrentScreenComponent = SCREEN_COMPONENTS[currentScreen].component

  const screenProps = {
    onBack: navigateBack,
    onClose: handleClose,
    currentIdentity,
    ...(currentScreen === 'main' && { onItemSelect: navigateToScreen })
  }

  return (
    <OverlayMenu
      isOpen={isOpen}
      onClose={handleClose}
      title={currentScreenConfig?.title || 'Settings'}
      showBackButton={currentScreen !== 'main'}
      onBack={currentScreen !== 'main' ? navigateBack : undefined}
    >
      <CurrentScreenComponent {...screenProps} />
    </OverlayMenu>
  )
}
