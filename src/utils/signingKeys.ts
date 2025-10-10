import type { PublicKeyInfo, KeyRequirement } from '../ui/components/keys'
import type { DashPlatformSDK } from 'dash-platform-sdk'
import type { PrivateAPIClient } from '../types'

/**
 * Loads available signing keys for a given identity
 * @param sdk - Dash Platform SDK instance
 * @param extensionAPI - Extension API instance
 * @param identity - Current identity identifier
 * @returns Promise that resolves to array of PublicKeyInfo
 */
export const loadSigningKeys = async (
  sdk: DashPlatformSDK,
  extensionAPI: PrivateAPIClient,
  identity: string
): Promise<PublicKeyInfo[]> => {
  const identityPublicKeys = await sdk.identities.getIdentityPublicKeys(identity)
  const availableKeyIds = await extensionAPI.getAvailableKeyPairs(identity)

  // Filter identity public keys to only show those that are available
  const availablePublicKeys = identityPublicKeys.filter((key: any) => {
    const keyId = key?.keyId ?? key?.getId?.() ?? null
    return keyId != null && availableKeyIds.includes(keyId)
  })

  const keys: PublicKeyInfo[] = availablePublicKeys.map((key: any) => {
    const keyId = key?.keyId ?? key?.getId?.() ?? null
    const purpose = String(key?.purpose ?? 'UNKNOWN')
    const security = String(key?.securityLevel ?? 'UNKNOWN')
    let hash = ''
    try {
      hash = key?.getPublicKeyHash?.() ?? ''
    } catch {}

    return {
      keyId: keyId ?? 0,
      securityLevel: security,
      purpose,
      hash
    }
  })

  return keys
}

/**
 * Checks if a key is compatible with the given requirements
 * @param key - The key to check
 * @param keyRequirements - Array of key requirements to match against
 * @returns true if the key matches any of the requirements
 */
export const isKeyCompatible = (key: PublicKeyInfo, keyRequirements: KeyRequirement[]): boolean => {
  if (keyRequirements.length === 0) {
    return true // No requirements means all keys are compatible
  }

  const keyPurpose = String(key.purpose)
  const keySecurityLevel = String(key.securityLevel)

  return keyRequirements.some(req =>
    req.purpose === keyPurpose && req.securityLevel === keySecurityLevel
  )
}
