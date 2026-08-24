export const SCHEMA_VERSION = 9
export const MESSAGING_TIMEOUT = 3 * 60 * 1000
// Shielded (Orchard) operations build a Halo2 proof, which is CPU-heavy and, in
// the popup (single-threaded WASM, no service worker), runs well past the normal
// messaging timeout. Give the client a much longer window for these calls so the
// proof can finish and the response is not dropped mid-flight.
export const SHIELDED_PROVE_TIMEOUT = 20 * 60 * 1000
export const POPUP_WINDOW_WIDTH = 250
export const POPUP_WINDOW_HEIGHT = 500

// ── Identity registration / asset lock pipeline ──────────────────────────────
export const MIN_FEE_RELAY = 1000n
export const LOCK_POLL_INTERVAL_MS = 5000
export const LOCK_TIMEOUT_MS = 15 * 60 * 1000
export const MIN_ASSET_LOCK_FUNDING_TX_CONFIRMATIONS = 6
// A freshly broadcast funding tx may not yet be on the DAPI node the SDK queries,
// or may not be instant-locked yet. Poll getTransaction until it is fetchable and
// locked/confirmed, instead of rejecting on the first "not found".
export const FUNDING_TX_POLL_INTERVAL_MS = 3000
export const FUNDING_TX_TIMEOUT_MS = 90 * 1000
// The identity is already created by the broadcast, so confirmation is best-effort:
// return once it finalizes (usually 1-3s) or after this timeout, rather than
// blocking registration indefinitely if the confirmation stream is slow.
export const REGISTRATION_CONFIRM_TIMEOUT_MS = 8000
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

// ── DIP-17 Platform payment addresses ────────────────────────────
// Derived at m/9'/coin'/17'/account'/keyClass'/index; keyClass 0 = clear funds.
// Address derivation and DIP-18 encoding live in the SDK (sdk.keyPair); these
// constants only label the derivation path we report alongside each address.
export const PLATFORM_ADDRESS_FEATURE = 17
export const PLATFORM_ADDRESS_KEY_CLASS_CLEAR_FUNDS = 0
// How many addresses one "show more" generation adds.
export const PLATFORM_ADDRESS_GENERATE_BATCH = 10
// Platform credit transfer estimates. The platform computes the real processing
// fee on-chain and the SDK exposes no estimator, so these are used only for the
// pre-flight balance check and for reporting an estimated fee. Set from observed
// testnet behaviour: an addressFundsTransfer charged ~9.5M credits, and the SDK
// pre-flight demanded ~15M available, so the guard is sized to the SDK's demand
// to avoid passing transfers the platform then rejects.
// MIN_OUTPUT_CREDITS guards against dust outputs.
export const MIN_OUTPUT_CREDITS = 500_000n
export const TRANSFER_FEE_CREDITS = 15_000_000n
// Core (L1) base58check address version bytes, used to decode a withdrawal
// recipient address into a P2PKH/P2SH script.
export const CORE_ADDRESS_VERSIONS = {
  testnet: { pubKeyHash: 0x8c, scriptHash: 0x13 },
  mainnet: { pubKeyHash: 0x4c, scriptHash: 0x10 }
}
// BIP32 serialization version bytes for Core extended keys (xprv/xpub on
// mainnet, tprv/tpub on testnet — Dash reuses the Bitcoin values). Needed to
// parse a stored account xpub: @scure/bip32 defaults to the mainnet pair and
// rejects a tpub with "Version mismatch".
export const CORE_BIP32_VERSIONS = {
  testnet: { private: 0x04358394, public: 0x043587cf },
  mainnet: { private: 0x0488ade4, public: 0x0488b21e }
}
// Defaults for the L1 tx a platform withdrawal produces. Adjustable — the
// platform builds the Core transaction from these. Pooling must be 'Never' (0):
// the platform has not implemented the other pooling mechanisms yet.
export const WITHDRAWAL_CORE_FEE_PER_BYTE = 1
export const WITHDRAWAL_POOLING = 'Never'
export const PLATFORM_ADDRESS_COIN_TYPE = {
  testnet: 1,
  mainnet: 5
}

// ── Shielded (Orchard) addresses ─────────────────────────────────────────────
// Orchard receiving addresses derive via ZIP-32 m/32'/coinType'/account' (the
// SDK owns the path); diversifierIndex selects a distinct diversified address
// sharing the account's viewing key.
export const SHIELDED_ADDRESS_DEFAULT_COUNT = 5
// How many addresses one "show more" generation adds.
export const SHIELDED_ADDRESS_GENERATE_BATCH = 10
// Page size when paging the shielded note set; mirrors the SDK's
// SHIELDED_MAX_NOTES_PER_QUERY gRPC limit.
export const SHIELDED_NOTES_PAGE_SIZE = 8192
// A shielded spend produces one Orchard action per input note, and the Halo2
// proof grows with the action count. Too many actions push the state transition
// past Platform's ~20KB size limit (observed to fail around 9 actions). Cap the
// number of notes a single spend may consume, well under that; if a spend needs
// more, the wallet must consolidate notes first. Tune once measured on-chain.
export const SHIELDED_MAX_SPEND_NOTES = 5
// Conservative fee headroom added on top of the amount when selecting which notes
// to spend, so the chosen notes cover amount + processing fee (change absorbs the
// remainder). Estimate — Platform computes the real fee on-chain.
export const SHIELDED_SPEND_FEE_CREDITS = 15_000_000n

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
