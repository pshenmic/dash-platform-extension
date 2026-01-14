export interface CreateIdentityPrivateKeyPayload {
  identity: string
  password: string
  keyType: string
  purpose: number
  securityLevel: number
  readOnly: boolean
}
