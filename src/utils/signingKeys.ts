import type { PublicKeyInfo } from '../ui/components/keys'
import type { DashPlatformSDK } from 'dash-platform-sdk'
import type { PrivateAPIClient } from '../types'

/**
 * Loads available signing keys for a given identity
 * @param sdk - Dash Platform SDK instance
 * @param extensionAPI - Extension API instance
 * @param currentIdentity - Current identity identifier
 * @returns Promise that resolves to array of PublicKeyInfo
 */
export const loadSigningKeys = async (
  sdk: DashPlatformSDK,
  extensionAPI: PrivateAPIClient,
  currentIdentity: string
): Promise<PublicKeyInfo[]> => {
  const identityPublicKeys = await sdk.identities.getIdentityPublicKeys(currentIdentity)
  const availableKeyIds = await extensionAPI.getAvailableKeyPairs(currentIdentity)

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
      hash = typeof key?.getPublicKeyHash === 'function' ? key.getPublicKeyHash() : ''
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
