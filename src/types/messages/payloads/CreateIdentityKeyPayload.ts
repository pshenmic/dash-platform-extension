export interface CreateIdentityKeyPayload {
  signingIdentity: string
  signingKeyId: number
  identity: string
  password: string
  keyId: number
  keyType: string
  purpose: string
  securityLevel: string
  readOnly: boolean
}
