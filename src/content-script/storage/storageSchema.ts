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
  address: string
  encryptedPrivateKey: string
  used: boolean
  assetLockTxid?: string | null
  // DIP-13 derivation index for top-up funding keys (m/9'/coin'/5'/2'/index).
  // Absent for registration entries, which use a one-time random funding key.
  index?: number
  // Defaults to 'registration' when absent (legacy entries predate top-up).
  purpose?: AssetLockFundingPurpose
}

export interface AssetLockFundingAddressesSchema {
  [address: string]: AssetLockFundingAddressSchema
}

export interface WalletSettingsStoreSchema {
  hideBalance: boolean
}
