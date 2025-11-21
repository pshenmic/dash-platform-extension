import { KeyType, Purpose, SecurityLevel } from 'pshenmic-dpp'

export interface KeyPair {
  keyId: number
  keyType: KeyType
  publicKeyHash: string
  purpose: Purpose
  securityLevel: SecurityLevel
  encryptedPrivateKey: string | null
}
