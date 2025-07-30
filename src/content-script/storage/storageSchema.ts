export interface KeyPairSchema {
  // base64
  identityPublicKey: string

  // hex
  encryptedPrivateKey: string | null
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
  network: string
  type: string
  label: string | null
  encryptedMnemonic: string | null
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

export interface AppConnectStorageSchema {
  id: string
  url: string
  status: string
}

export interface AppConnectsStorageSchema {
  [id: string]: AppConnectStorageSchema
}
