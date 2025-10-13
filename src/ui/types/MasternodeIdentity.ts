export interface MasternodeIdentityInput {
  proTxHash: string
  ownerKey: string
  votingKey: string
  payoutKey: string
}

export interface PublicKeyData {
  keyId: number
  purpose: string
  securityLevel: string
  type: string
  isAvailable?: boolean
}

export interface IdentityPublicKey {
  keyId: number
  purpose?: number
  securityLevel?: number
  keyType?: number
  getPublicKeyHash: () => string
}

export interface IdentityPreviewData {
  id: string
  name?: string
  balance: string
  publicKeys: PublicKeyData[]
}

export interface MasternodeIdentityPreviewData {
  identities: Array<{
    id: string
    type: 'masternode' | 'voting'
    balance: string
    publicKeys: PublicKeyData[]
  }>
  keys: {
    ownerHex: string
    votingHex?: string
    payoutHex?: string
  }
  proTxHash: string
}
