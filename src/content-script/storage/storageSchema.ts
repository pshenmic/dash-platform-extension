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
}

export interface AppConnectsStorageSchema {
  [id: string]: AppConnectStorageSchema
}

export type AssetLockFundingPurpose = 'registration' | 'topUp'

export interface AssetLockFundingAddressSchema {
  // The address this entry is keyed by: the one-off deposit address for a funded
  // asset lock, or the credit output address when the wallet pays with its own
  // coins (nothing is deposited, so there is no deposit address to name).
  address: string
  // Null when the wallet pays with its own coins: the inputs are signed by BIP44
  // keys derived from the seed, so there is no one-off key to keep.
  encryptedPrivateKey: string | null
  used: boolean
  assetLockTxid?: string | null
  // The signed asset lock, hex, stored before it is broadcast when the wallet pays
  // with its own coins. A deposit has a single input and rebuilds byte for byte, but
  // a selection over the wallet's own UTXOs would change as soon as one of them is
  // spent elsewhere, and a retry must send the same transaction, not a second one.
  assetLockTx?: string
  // DIP-13 derivation index for top-up funding keys (m/9'/coin'/5'/2'/index).
  // Absent for registration entries, which use a one-time random funding key.
  index?: number
  // The identityIndex the broadcast asset lock funded (its credit output is
  // owned by the registration key at m/9'/coin'/5'/1'/identityIndex). Pinned at
  // broadcast so a retry rebuilds the SAME asset lock instead of re-scanning to a
  // different index (which would change the credit address and hence the txid).
  // Absent on legacy entries broadcast before this was persisted.
  registrationIdentityIndex?: number
  // Defaults to 'registration' when absent (legacy entries predate top-up).
  purpose?: AssetLockFundingPurpose
  // The identity a 'topUp' address is reserved for. Without an owner every
  // top-up in a wallet is handed the same pending address, so two of them run
  // into each other: the first payment claims the asset lock and the second is
  // rejected as already used. Absent on registration entries, and on top-up
  // entries created before addresses were reserved per identity.
  identityId?: string
}

export interface AssetLockFundingAddressesSchema {
  [address: string]: AssetLockFundingAddressSchema
}

export interface WalletSettingsStoreSchema {
  hideBalance: boolean
}
