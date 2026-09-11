export const SCHEMA_VERSION = 9
export const MESSAGING_TIMEOUT = 3 * 60 * 1000
// Shielded (Orchard) Halo2 proofs are CPU-heavy and run well past the normal
// timeout in the popup — give these calls a much longer window.
export const SHIELDED_PROVE_TIMEOUT = 20 * 60 * 1000
// Operations that wait for L1 confirmations outlive the default timeout.
export const BLOCKCHAIN_MESSAGING_TIMEOUT = 30 * 60 * 1000
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

// Smallest funding payment a top-up can be built from, in duffs.
// Platform needs ~50500 duffs of credits to process the top-up, plus the asset lock tx fee.
export const MIN_TOPUP_FUNDING_DUFFS = 100000n
export const MIN_TOPUP_FUNDING_DASH = Number(MIN_TOPUP_FUNDING_DUFFS) / 1e8

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

// ── Core (L1) spending ───────────────────────────────────────────────────────
// Sizes of the pieces of a signed P2PKH transaction, in bytes, used to price the
// fee before the inputs are signed. These are exact upper bounds rather than
// guesses: dash-core-sdk signs with lowS, so s never carries a sign-padding byte
// and the scriptSig tops out at 107 — a signed transaction lands on the estimate
// or just under it, never above.
//   input : 32 txid + 4 vout + 1 script length + 107 scriptSig + 4 sequence
//   output: 8 value + 1 script length + 25 P2PKH script
//   header: 4 version|type + 1 input count + 1 output count + 4 nLockTime
export const CORE_P2PKH_INPUT_BYTES = 148
export const CORE_P2PKH_OUTPUT_BYTES = 34
export const CORE_TX_OVERHEAD_BYTES = 10
// Dash's minimum relay fee is 1000 duffs per kB, which is 1 duff per byte. Note
// that MIN_FEE_RELAY above is that same rate written per kB: it is a rate, not a
// minimum fee amount, so it must not be used as a floor on a computed fee.
export const CORE_FEE_PER_BYTE = 1n
// Dash Core's dust threshold for a P2PKH output: (34 output + 148 spending
// input) * 3000 duffs/kB dustRelayFee. Outputs at or below it are non-standard,
// so an amount that small is rejected and change that small is dropped into the fee.
export const CORE_DUST_THRESHOLD = 546n
// dashscan takes the address list in the query string; chunk it so a wallet with
// many used addresses cannot blow the URL length limit.
export const CORE_UTXO_ADDRESS_BATCH = 50
// How long a broadcast transaction the explorer has not indexed keeps its inputs
// reserved. Normally an entry is dropped as soon as the explorer stops listing
// those inputs, well inside this window — Dash mines every 2.5 minutes. The
// deadline only matters for a transaction that never confirms, so that a
// dropped or conflicting one cannot strand the funds forever.
export const CORE_PENDING_SPEND_TTL_MS = 6 * 60 * 60 * 1000

// ── DIP-17 Platform payment addresses ────────────────────────────
// Derived at m/9'/coin'/17'/account'/keyClass'/index; keyClass 0 = clear funds.
// Address derivation and DIP-18 encoding live in the SDK (sdk.keyPair); these
// constants only label the derivation path we report alongside each address.
export const PLATFORM_ADDRESS_FEATURE = 17
export const PLATFORM_ADDRESS_KEY_CLASS_CLEAR_FUNDS = 0
// How many addresses one "show more" generation adds.
export const PLATFORM_ADDRESS_GENERATE_BATCH = 10
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
// BIP32 serialization version bytes for Core extended keys (xprv/xpub on
// mainnet, tprv/tpub on testnet — Dash reuses the Bitcoin values). Needed to
// parse a stored account xpub: @scure/bip32 defaults to the mainnet pair and
// rejects a tpub with "Version mismatch".
export const CORE_BIP32_VERSIONS = {
  testnet: { private: 0x04358394, public: 0x043587cf },
  mainnet: { private: 0x0488ade4, public: 0x0488b21e }
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
// How many addresses one "show more" generation adds.
export const SHIELDED_ADDRESS_GENERATE_BATCH = 10
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
