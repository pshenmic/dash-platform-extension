export interface CreateIdentityKeyPayload {
  identity: string
  password?: string // Optional: only required for seedphrase wallets
  // Public key parameters - needed for keystore wallets to save the key
  keyId?: number
  keyType?: number
  purpose?: number
  securityLevel?: number
  readOnly?: boolean
}
