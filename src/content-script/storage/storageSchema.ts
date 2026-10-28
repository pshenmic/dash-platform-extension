export interface KeyPairSchema {
  keyId: number

  pending: boolean

  // hex
  encryptedPrivateKey: string | null
}

export interface KeyPairsSchema {
  [identity: string]: KeyPairSchema[]
}

export interface IdentityStoreSchema {
  index: number
  label: null | string
  identifier: string
  proTxHash: null | string
  type: string
}

export interface IdentitiesStoreSchema {
  [identity: string]: IdentityStoreSchema
}

export interface WalletStoreSchema {
  walletId: string
  network: string
  type: string
  label: string | null
  encryptedMnemonic: string | null
  seedHash: string | null
  currentIdentity: string | null
  // Cached DIP-17 account-level extended public keys (xpub), keyed by account
  // index. Stored once per account (needs the password) so platform addresses
  // can be re-derived publicly afterwards without unlocking the seed.
  platformXpubs?: Record<string, string>
  // Number of platform addresses created so far, keyed by account index. Acts as
  // the next derivation index — created addresses are 0..count-1, the next one
  // created is `count`.
  platformAddressCounts?: Record<string, number>
  // Number of shielded (Orchard) addresses created so far, keyed by account
  // index. Acts as the next diversifier index — created addresses are
  // 0..count-1, the next one created is `count`.
  shieldedAddressCounts?: Record<string, number>
  // Cached BIP44 account-level extended public keys (xpub) for Core (L1),
  // m/44'/coin'/account', keyed by account index. Same contract as
  // platformXpubs: stored once (needs the password) so Core addresses can be
  // re-derived publicly afterwards without unlocking the seed.
  coreXpubs?: Record<string, string>
}

export interface StateTransitionsStoreSchema {
  [hash: string]: StateTransitionStoreSchema
}

export interface StateTransitionStoreSchema {
  unsignedHash: string
  signedHash: string | null
  unsigned: string
  signature: string | null
  signaturePublicKeyId: number | null
  status: string
  error: string | null
}

export interface AppConnectStorageSchema {
  id: string
  url: string
  status: string
  // Identifiers of the identities this website was granted. Empty until the
  // user approves the connection, and never wider than what they picked.
  identities: string[]
}

export interface AppConnectsStorageSchema {
  [id: string]: AppConnectStorageSchema
}

// An asset lock this wallet broadcast and has not finished spending yet. Written
// before the transaction can reach the network and removed once the Platform
// side is done, so an operation interrupted in between leaves a trace - the
// funds are on L1 by then, and without this nothing would say so.
export interface PendingAssetLockSchema {
  assetLockTxid: string
  // What the operation was started with, so it can be repeated as it was: the
  // address that paid and the transaction that paid it.
  fundingAddress: string
  fundingTxid: string
  purpose: AssetLockFundingPurpose
  // Who the money was for: an identity for a top-up, a platform address for a
  // funding, a shielded address for a shield. All null for a registration, which
  // creates its recipient. A shield into the wallet's own pool leaves
  // shieldedAddress null too - the address is derived from the seed, and writing
  // it down would say more than the record needs to.
  identityId: string | null
  platformAddress: string | null
  shieldedAddress: string | null
  // Locked amount in duffs, so a caller can tell what is at stake.
  amountDuffs: string
  createdAt: number
}

export interface PendingAssetLocksSchema {
  [assetLockTxid: string]: PendingAssetLockSchema
}

export type AssetLockFundingPurpose = 'registration' | 'topUp' | 'fundAddress' | 'shield'

export interface AssetLockFundingAddressSchema {
  address: string
  encryptedPrivateKey: string
  used: boolean
  assetLockTxid?: string | null
  // DIP-13 derivation index for top-up funding keys (m/9'/coin'/5'/2'/index).
  // Absent for registration entries, which use a one-time random funding key.
  index?: number
  // The identityIndex the broadcast asset lock funded (its credit output is
  // owned by the registration key at m/9'/coin'/5'/1'/identityIndex). Pinned at
  // broadcast so a retry rebuilds the SAME asset lock instead of re-scanning to a
  // different index (which would change the credit address and hence the txid).
  // Absent on legacy entries broadcast before this was persisted.
  registrationIdentityIndex?: number
  // The wallet's own payment to this address, written before that transaction
  // can reach the network. Only operations that pay the funding address
  // themselves set it; a deposit the user sends from elsewhere has no txid to
  // write here. It is what keeps a repeated operation from paying twice: the
  // explorer cannot see a payment made moments ago, so without it the address
  // reads as unfunded and would be paid again.
  fundingTxid?: string
  // What that payment put on the address, in duffs, and when it was made. An
  // operation interrupted here has money sitting on an address and nothing on
  // L1 to show for it, so LIST_PENDING_ASSET_LOCKS reports it from these.
  fundedAmountDuffs?: string
  fundedAt?: number
  // The signed payment itself, kept until the deposit is spent by an asset lock.
  // Writing the txid before broadcasting keeps a repeat from paying twice, but
  // on its own it leaves the chain waiting for a transaction nobody has when the
  // broadcast itself fails. With the bytes here the repeat sends that exact
  // transaction again: same inputs, same txid, so the network either accepts it
  // or reports it as already known.
  fundingTxHex?: string
  // Defaults to 'registration' when absent (legacy entries predate top-up).
  purpose?: AssetLockFundingPurpose
  // The identity a 'topUp' address is reserved for. Without an owner every
  // top-up in a wallet is handed the same pending address, so two of them run
  // into each other: the first payment claims the asset lock and the second is
  // rejected as already used. Absent on registration entries, and on top-up
  // entries created before addresses were reserved per identity.
  identityId?: string
  // Who a 'fundAddress' or 'shield' address is reserved for: the platform
  // address to credit, or the shielded address to deposit into ('own' for the
  // wallet's own pool). The identity counterpart of `identityId`, and reserved
  // for the same reason: without it an interrupted operation's deposit is handed
  // to the next operation, which would send one recipient's money to another.
  recipient?: string
}

export interface AssetLockFundingAddressesSchema {
  [address: string]: AssetLockFundingAddressSchema
}

export interface WalletSettingsStoreSchema {
  hideBalance: boolean
}
