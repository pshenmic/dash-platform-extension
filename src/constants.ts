export const SCHEMA_VERSION = 8
export const MESSAGING_TIMEOUT = 3 * 60 * 1000
export const POPUP_WINDOW_WIDTH = 250
export const POPUP_WINDOW_HEIGHT = 500

export const PLATFORM_EXPLORER_URLS = {
  testnet: {
    api: 'https://testnet.platform-explorer.pshenmic.dev',
    explorer: 'https://testnet.platform-explorer.com'
  },
  mainnet: {
    api: 'https://platform-explorer.pshenmic.dev',
    explorer: 'https://platform-explorer.com'
  }
} as const
