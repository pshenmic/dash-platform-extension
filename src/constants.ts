export const SCHEMA_VERSION = 9
export const MESSAGING_TIMEOUT = 3 * 60 * 1000
export const POPUP_WINDOW_WIDTH = 250
export const POPUP_WINDOW_HEIGHT = 500

// ── Identity registration / asset lock pipeline ──────────────────────────────
export const MIN_FEE_RELAY = 1000n
export const LOCK_POLL_INTERVAL_MS = 5000
export const LOCK_TIMEOUT_MS = 15 * 60 * 1000
export const MIN_ASSET_LOCK_FUNDING_TX_CONFIRMATIONS = 6
export const TXID_HEX_LENGTH = 64

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

// ── DIP-17 transparent platform payment addresses ────────────────────────────
// Derived at m/9'/coin'/17'/account'/keyClass'/index; keyClass 0 = clear funds.
// Address derivation and DIP-18 encoding live in the SDK (sdk.keyPair); these
// constants only label the derivation path we report alongside each address.
export const PLATFORM_ADDRESS_FEATURE = 17
export const PLATFORM_ADDRESS_KEY_CLASS_CLEAR_FUNDS = 0
export const PLATFORM_ADDRESS_DEFAULT_COUNT = 20
// Platform credit transfer estimates. The platform computes the real processing
// fee on-chain and the SDK exposes no estimator, so these are used only for the
// pre-flight balance check and for reporting an estimated fee.
// MIN_OUTPUT_CREDITS guards against dust outputs.
export const MIN_OUTPUT_CREDITS = 500_000n
export const TRANSFER_FEE_CREDITS = 6_500_000n
// Core (L1) base58check address version bytes, used to decode a withdrawal
// recipient address into a P2PKH/P2SH script.
export const CORE_ADDRESS_VERSIONS = {
  testnet: { pubKeyHash: 0x8c, scriptHash: 0x13 },
  mainnet: { pubKeyHash: 0x4c, scriptHash: 0x10 }
}
// Defaults for the L1 tx a platform withdrawal produces. Adjustable — the
// platform builds the Core transaction from these.
export const WITHDRAWAL_CORE_FEE_PER_BYTE = 1
export const WITHDRAWAL_POOLING = 'Standard'
export const PLATFORM_ADDRESS_COIN_TYPE = {
  testnet: 1,
  mainnet: 5
}

// ── Shielded (Orchard) addresses ─────────────────────────────────────────────
// Orchard receiving addresses derive via ZIP-32 m/32'/coinType'/account' (the
// SDK owns the path); diversifierIndex selects a distinct diversified address
// sharing the account's viewing key.
export const SHIELDED_ADDRESS_DEFAULT_COUNT = 5
// Page size when paging the shielded note set; mirrors the SDK's
// SHIELDED_MAX_NOTES_PER_QUERY gRPC limit.
export const SHIELDED_NOTES_PAGE_SIZE = 8192

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
