export const SCHEMA_VERSION = 9
export const MESSAGING_TIMEOUT = 3 * 60 * 1000
export const POPUP_WINDOW_WIDTH = 250
export const POPUP_WINDOW_HEIGHT = 500

// ── Identity registration / asset lock pipeline ──────────────────────────────
export const MIN_FEE_RELAY = 1000n
export const FEE_PER_BYTE = 1n
// 32 (txid) + 4 (vout) + 8 + 108 (signed scriptSig) + 4 (sequence); mirrors dash-core-sdk's internal SIGNED_INPUT_MAX_SIZE used in Transaction.generateChange
export const SIGNED_INPUT_MAX_SIZE = 156n
export const LOCK_POLL_INTERVAL_MS = 5000
export const LOCK_TIMEOUT_MS = 15 * 60 * 1000
export const MIN_ASSET_LOCK_FUNDING_TX_CONFIRMATIONS = 6
export const TXID_HEX_LENGTH = 64

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
