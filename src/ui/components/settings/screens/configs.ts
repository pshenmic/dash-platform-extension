import type { ScreenConfig } from '../types'
import {
  mainScreenConfig,
  walletSettingsConfig,
  connectedWebsitesConfig,
  platformAddressesConfig
} from './MainSettingsScreen'
import { helpSupportScreenConfig } from './HelpSupportScreen'
import { aboutScreenConfig } from './AboutScreen'
import { privateKeysScreenConfig } from './PrivateKeysScreen'
import { importPrivateKeysScreenConfig } from './ImportPrivateKeysScreen'
import { createKeyScreenConfig } from './CreateKeyScreen'

export const screenConfigs: Record<string, ScreenConfig> = {
  main: mainScreenConfig,
  'current-wallet': walletSettingsConfig,
  'connected-websites': connectedWebsitesConfig,
  'platform-addresses': platformAddressesConfig,
  'private-keys': privateKeysScreenConfig,
  'import-private-keys-settings': importPrivateKeysScreenConfig,
  'create-key-settings': createKeyScreenConfig,
  'help-support': helpSupportScreenConfig,
  'about-dash': aboutScreenConfig
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
