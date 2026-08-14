export const SCHEMA_VERSION = 9
export const MESSAGING_TIMEOUT = 3 * 60 * 1000
// Operations that wait for L1 confirmations outlive the default timeout.
export const BLOCKCHAIN_MESSAGING_TIMEOUT = 30 * 60 * 1000
export const POPUP_WINDOW_WIDTH = 250
export const POPUP_WINDOW_HEIGHT = 500

// ── Identity registration / asset lock pipeline ──────────────────────────────
export const MIN_FEE_RELAY = 1000n
export const LOCK_POLL_INTERVAL_MS = 5000
export const LOCK_TIMEOUT_MS = 15 * 60 * 1000
export const MIN_ASSET_LOCK_FUNDING_TX_CONFIRMATIONS = 6
export const TXID_HEX_LENGTH = 64

// Smallest funding payment a top-up can be built from, in duffs.
// Platform needs ~50500 duffs of credits to process the top-up, plus the asset lock tx fee.
export const MIN_TOPUP_FUNDING_DUFFS = 100000n
export const MIN_TOPUP_FUNDING_DASH = Number(MIN_TOPUP_FUNDING_DUFFS) / 1e8

// Gap limit for scanning DIP-13 top-up funding indexes (m/9'/coin'/5'/2'/N)
// against L1 address usage when picking the next unused funding address.
export const TOPUP_FUNDING_GAP_LIMIT = 20

// Upper bound for scanning identity indexes on-chain when picking the next free
// index for a new identity registration. Bounds the work and prevents an
// unbounded loop if every probed index keeps reporting a registered identity.
export const IDENTITY_INDEX_SCAN_LIMIT = 20

// dashscan (L1 / Dash Core) REST API — source of address usage and UTXOs for
// the top-up funding gap-scan. Mirrors the testnet-prefixed host scheme of
// PLATFORM_EXPLORER_URLS.
export const CORE_EXPLORER_URLS = {
  testnet: {
    api: 'https://testnet.dashscan.pshenmic.dev'
  },
  mainnet: {
    api: 'https://dashscan.pshenmic.dev'
  }
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
