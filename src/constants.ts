export const SCHEMA_VERSION = 9
export const MESSAGING_TIMEOUT = 3 * 60 * 1000
export const REGISTER_IDENTITY_TIMEOUT = 15 * 60 * 1000
export const POPUP_WINDOW_WIDTH = 250
export const POPUP_WINDOW_HEIGHT = 500

// ── Identity registration / asset lock pipeline ──────────────────────────────
export const FEE_PER_BYTE = 1
export const MIN_FEE_RELAY = 1000n
export const LOCK_POLL_INTERVAL_MS = 5000
export const LOCK_TIMEOUT_MS = 15 * 60 * 1000
export const MAX_BROADCAST_RETRIES = 5
export const BROADCAST_RETRY_DELAY_MS = 15_000
export const MIN_PAYMENT_TX_CONFIRMATIONS = 1
export const TXID_HEX_LENGTH = 64
export const IDENTITY_MASTER_KEY_BYTE_LENGTH = 32

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
