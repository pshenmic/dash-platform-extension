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

export const screenConfigs: Record<string, ScreenConfig> = {
  main: mainScreenConfig,
  'current-wallet': walletSettingsConfig,
  preferences: preferencesScreenConfig,
  'connected-dapps': connectedDappsConfig,
  'private-keys': privateKeysScreenConfig,
  'import-private-keys-settings': importPrivateKeysScreenConfig,
  'security-privacy': securityPrivacyConfig,
  'help-support': helpSupportScreenConfig,
  'about-dash': aboutDashConfig
}

export const getScreenTitles = (): Record<string, string> => {
  const titles: Record<string, string> = {}
  Object.entries(screenConfigs).forEach(([key, config]) => {
    titles[key] = config.title
  })
  return titles
}

export const getScreenConfig = (screenId: string): ScreenConfig | undefined => {
  return screenConfigs[screenId]
}
