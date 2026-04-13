export const SCHEMA_VERSION = 9
export const MESSAGING_TIMEOUT = 3 * 60 * 1000
export const REGISTER_IDENTITY_TIMEOUT = 15 * 60 * 1000
export const POPUP_WINDOW_WIDTH = 250
export const POPUP_WINDOW_HEIGHT = 500

/**
 * Core DAPI node URLs used by DashCoreSDK for asset lock transactions.
 * Override via CORE_DAPI_URLS[network] for non-default nodes.
 */
export const CORE_DAPI_URLS: Record<string, string> = {
  testnet: 'https://52.24.124.162:1443',
  mainnet: 'https://node.dash.org:443'
}

export const PLATFORM_EXPLORER_URLS = {
  testnet: {
    api: 'https://testnet.platform-explorer.pshenmic.dev',
    explorer: 'https://testnet.platform-explorer.com'
  },
  mainnet: {
    api: 'https://platform-explorer.pshenmic.dev',
    explorer: 'https://platform-explorer.com'
  }
}
