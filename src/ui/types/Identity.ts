export interface PublicKeyData {
  keyId: number
  purpose: string
  securityLevel: string
  type: string
  isAvailable?: boolean
}

export interface IdentityPreviewData {
  id: string
  name?: string
  balance: string
  publicKeys: PublicKeyData[]
}

export interface IdentityPublicKey {
  keyId: number
  purpose?: number
  securityLevel?: number
  keyType?: number
  getPublicKeyHash: () => string
}
