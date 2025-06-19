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
    label?: string
}

export interface IdentitiesStoreSchema {
    [identity: string]: IdentityStoreSchema
}

export interface WalletStoreSchema {
    walletId: string
    type: string
    network: string
    label?: string
    currentIdentity?: string
}

export interface StateTransitionStoreSchema {
    hash: string
    unsigned: string
    signature?: string
    signaturePublicKeyId?: number
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
