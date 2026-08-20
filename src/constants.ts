export const SCHEMA_VERSION = 9
export const MESSAGING_TIMEOUT = 3 * 60 * 1000
// Shielded (Orchard) Halo2 proofs are CPU-heavy and run well past the normal
// timeout in the popup — give these calls a much longer window.
export const SHIELDED_PROVE_TIMEOUT = 20 * 60 * 1000
export const POPUP_WINDOW_WIDTH = 250
export const POPUP_WINDOW_HEIGHT = 500

// ── Identity registration / asset lock pipeline ──────────────────────────────
export const MIN_FEE_RELAY = 1000n
export const LOCK_POLL_INTERVAL_MS = 5000
export const LOCK_TIMEOUT_MS = 15 * 60 * 1000
export const MIN_ASSET_LOCK_FUNDING_TX_CONFIRMATIONS = 6
// Poll getTransaction until the freshly broadcast funding tx is fetchable and
// locked/confirmed, rather than rejecting on the first "not found".
export const FUNDING_TX_POLL_INTERVAL_MS = 3000
export const FUNDING_TX_TIMEOUT_MS = 90 * 1000
// Confirmation is best-effort — the identity already exists after broadcast.
export const REGISTRATION_CONFIRM_TIMEOUT_MS = 8000
export const TXID_HEX_LENGTH = 64

// Gap limit for scanning DIP-13 top-up funding indexes (m/9'/coin'/5'/2'/N).
export const TOPUP_FUNDING_GAP_LIMIT = 20

// Upper bound for scanning identity indexes when picking the next free one.
export const IDENTITY_INDEX_SCAN_LIMIT = 20

// dashscan (L1 / Dash Core) REST API — address usage + UTXOs for the top-up gap-scan.
export const CORE_EXPLORER_URLS = {
  testnet: {
    api: 'https://testnet.dashscan.pshenmic.dev'
  },
  mainnet: {
    api: 'https://dashscan.pshenmic.dev'
  }
}

// ── DIP-17 Platform payment addresses ────────────────────────────
// Derived at m/9'/coin'/17'/account'/keyClass'/index; keyClass 0 = clear funds.
// Address derivation and DIP-18 encoding live in the SDK (sdk.keyPair); these
// constants only label the derivation path we report alongside each address.
export const PLATFORM_ADDRESS_FEATURE = 17
export const PLATFORM_ADDRESS_KEY_CLASS_CLEAR_FUNDS = 0
export const PLATFORM_ADDRESS_DEFAULT_COUNT = 20
// Platform computes the real fee on-chain; these drive only the pre-flight
// balance check and the estimated fee. Sized to the SDK's ~15M pre-flight demand.
// MIN_OUTPUT_CREDITS guards against dust outputs.
export const MIN_OUTPUT_CREDITS = 500_000n
export const TRANSFER_FEE_CREDITS = 15_000_000n
// Core (L1) base58check version bytes for decoding a withdrawal address to a script.
export const CORE_ADDRESS_VERSIONS = {
  testnet: { pubKeyHash: 0x8c, scriptHash: 0x13 },
  mainnet: { pubKeyHash: 0x4c, scriptHash: 0x10 }
}
// Defaults for the L1 tx a withdrawal produces. Pooling must be 'Never' (0) —
// the platform hasn't implemented the other pooling mechanisms yet.
export const WITHDRAWAL_CORE_FEE_PER_BYTE = 1
export const WITHDRAWAL_POOLING = 'Never'
export const MIN_WITHDRAWAL_CREDITS = 1_000_000n
export const MAX_WITHDRAWAL_CREDITS = 50_000_000_000_000n
export const PLATFORM_ADDRESS_COIN_TYPE = {
  testnet: 1,
  mainnet: 5
}

// ── Shielded (Orchard) addresses ─────────────────────────────────────────────
// ZIP-32 m/32'/coinType'/account' (SDK owns the path); diversifierIndex picks a
// distinct diversified address sharing the account's viewing key.
export const SHIELDED_ADDRESS_DEFAULT_COUNT = 5
// Page size when paging the note set; mirrors the SDK's gRPC query limit.
export const SHIELDED_NOTES_PAGE_SIZE = 8192
// Max notes per spend: proof size grows per input note and the state transition
// must stay under Platform's ~20KB limit (observed to fail around 9 actions).
export const SHIELDED_MAX_SPEND_NOTES = 5
// Fee headroom added when selecting notes, so they cover amount + fee (change
// absorbs the rest). Estimate — Platform computes the real fee on-chain.
export const SHIELDED_SPEND_FEE_CREDITS = 15_000_000n
// Sentinel recipient for `shieldToPool` (which derives the destination from the
// seed and takes no recipient) — carries "own pool" from send form to confirm.
export const SHIELDED_POOL_RECIPIENT = 'shielded-pool'

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
