import { KeyType, Purpose, SecurityLevel } from 'dash-platform-sdk/types'

export interface KeyPair {
  keyId: number
  keyType: KeyType
  publicKeyHash: string
  purpose: Purpose
  securityLevel: SecurityLevel
  encryptedPrivateKey: string | null
  pending: boolean
}
