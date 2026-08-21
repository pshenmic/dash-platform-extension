/**
 * Key creation form configuration options
 */

interface ConfigItem<T> {
  id: string
  label: string
  value: T
}

export const KEY_TYPES: Array<ConfigItem<string>> = [
  { id: 'ECDSA_SECP256K1', label: 'ECDSA_SECP256K1', value: 'ECDSA_SECP256K1' },
  { id: 'ECDSA_HASH160', label: 'ECDSA_HASH160', value: 'ECDSA_HASH160' }
]

export const PURPOSES: Array<ConfigItem<number>> = [
  { id: 'AUTHENTICATION', label: 'Authentication', value: 0 },
  { id: 'ENCRYPTION', label: 'Encryption', value: 1 },
  { id: 'DECRYPTION', label: 'Decryption', value: 2 },
  { id: 'TRANSFER', label: 'Transfer', value: 3 }
]

export const SECURITY_LEVELS: Array<ConfigItem<number>> = [
  { id: 'MASTER', label: 'Master', value: 0 },
  { id: 'CRITICAL', label: 'Critical', value: 1 },
  { id: 'HIGH', label: 'High', value: 2 },
  { id: 'MEDIUM', label: 'Medium', value: 3 }
]

export const READ_ONLY_OPTIONS: Array<ConfigItem<boolean>> = [
  { id: 'false', label: 'False', value: false },
  { id: 'true', label: 'True', value: true }
]
