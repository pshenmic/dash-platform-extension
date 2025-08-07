import React, { useState } from 'react'
import { OverlayMenu } from './OverlayMenu'
import { MainSettingsScreen } from './screens/MainSettingsScreen'
import { WalletSettingsScreen } from './screens/WalletSettingsScreen'
import { SecuritySettingsScreen } from './screens/SecuritySettingsScreen'
import { PreferencesScreen } from './screens/PreferencesScreen'
import { ConnectedDappsScreen } from './screens/ConnectedDappsScreen'
import { HelpSupportScreen } from './screens/HelpSupportScreen'
import { AboutScreen } from './screens/AboutScreen'

type ScreenType = 'main' | 'current-wallet' | 'preferences' | 'connected-dapps' | 'security-privacy' | 'help-support' | 'about-dash'

interface ScreenConfig {
  title: string
  component: React.ComponentType<any>
}

const SCREENS: Record<ScreenType, ScreenConfig> = {
  main: {
    title: 'Settings',
    component: MainSettingsScreen
  },
  'current-wallet': {
    title: 'Wallet Settings',
    component: WalletSettingsScreen
  },
  preferences: {
    title: 'Preferences',
    component: PreferencesScreen
  },
  'connected-dapps': {
    title: 'Connected dapps',
    component: ConnectedDappsScreen
  },
  'security-privacy': {
    title: 'Security & Privacy',
    component: SecuritySettingsScreen
  },
  'help-support': {
    title: 'Help and Support',
    component: HelpSupportScreen
  },
  'about-dash': {
    title: 'About Dash Extension',
    component: AboutScreen
  }
}

interface SettingsMenuProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  isOpen,
  onClose
}) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('main')
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(['main'])

  const navigateToScreen = (screenId: string): void => {
    if (screenId === 'logout') {
      // Special case for logout
      handleLogout()
      return
    }

    const screenType = screenId as ScreenType
    if (SCREENS[screenType]) {
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

  const currentScreenConfig = SCREENS[currentScreen]
  const CurrentScreenComponent = currentScreenConfig.component

  const screenProps = {
    onBack: navigateBack,
    onClose: handleClose,
    ...(currentScreen === 'main' && { onItemSelect: navigateToScreen })
  }

  return (
    <OverlayMenu
      isOpen={isOpen}
      onClose={handleClose}
      title={currentScreenConfig.title}
      showBackButton={currentScreen !== 'main'}
      onBack={currentScreen !== 'main' ? navigateBack : undefined}
    >
      <CurrentScreenComponent {...screenProps} />
    </OverlayMenu>
  )
}
