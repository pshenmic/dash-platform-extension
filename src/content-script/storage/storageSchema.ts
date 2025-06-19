export interface KeyPairSchema {
  // base64
  identityPublicKey: string

  // hex
  encryptedPrivateKey?: string
}

export interface KeyPairsSchema {
  [identity: string]: KeyPairSchema[]
}

export interface IdentityStoreSchema {
  index: number
  identifier: string
  label: string | null
}

export interface IdentitiesStoreSchema {
  [identity: string]: IdentityStoreSchema
}

export interface WalletStoreSchema {
  walletId: string
  type: string
  network: string
  label: string | null
  currentIdentity: string | null
}

export interface StateTransitionsStoreSchema {
  [hash: string]: StateTransitionStoreSchema
}

export interface StateTransitionStoreSchema {
  hash: string
  unsigned: string
  signature: string | null
  signaturePublicKeyId: number | null
  status: string
}

interface WalletSchema {
  seed?: string
  identities: Identity
}

interface Identity {
  label?: string
  identifier: string
  privateKeys: string[]
}

export interface AppConnectStorageSchema {
  id: string
  url: string
  status: string
}

export interface AppConnectsStorageSchema {
  [id: string]: AppConnectStorageSchema
}
