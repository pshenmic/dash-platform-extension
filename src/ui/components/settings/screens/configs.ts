import type { ScreenConfig } from '../types'
import {
  mainScreenConfig,
  walletSettingsConfig,
  connectedDappsConfig,
  securityPrivacyConfig,
  aboutDashConfig
} from './MainSettingsScreen'
import { helpSupportScreenConfig } from './HelpSupportScreen'
import { preferencesScreenConfig } from './PreferencesScreen'
import { privateKeysScreenConfig } from './PrivateKeysScreen'
import { importPrivateKeysScreenConfig } from './ImportPrivateKeysScreen'

// Collect all screen configurations
export const screenConfigs: Record<string, ScreenConfig> = {
  main: mainScreenConfig,
  'current-wallet': walletSettingsConfig,
  preferences: preferencesScreenConfig, // Use the full configuration with content
  'connected-dapps': connectedDappsConfig,
  'private-keys': privateKeysScreenConfig, // Use the full configuration with content
  'import-private-keys-settings': importPrivateKeysScreenConfig, // Import private keys screen
  'security-privacy': securityPrivacyConfig,
  'help-support': helpSupportScreenConfig, // Use the full configuration with content
  'about-dash': aboutDashConfig
}

// Function to get screen titles
export const getScreenTitles = (): Record<string, string> => {
  const titles: Record<string, string> = {}
  Object.entries(screenConfigs).forEach(([key, config]) => {
    titles[key] = config.title
  })
  return titles
}

// Function to get screen configuration
export const getScreenConfig = (screenId: string): ScreenConfig | undefined => {
  return screenConfigs[screenId]
}
