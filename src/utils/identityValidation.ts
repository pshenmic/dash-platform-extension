import { DashPlatformSDK } from 'dash-platform-sdk'
import { validateIdentifier } from './index'
import type { PlatformExplorerClient } from '../types'
import type { NetworkType } from '../types'

export interface IdentityValidationState {
  isValidating: boolean
  isValid: boolean | null
  error: string | null
}

export const validateRecipientIdentifier = async (
  identifier: string,
  platformExplorerClient: PlatformExplorerClient,
  sdk: DashPlatformSDK,
  currentNetwork: NetworkType | null
): Promise<IdentityValidationState> => {
  if (!identifier.trim()) {
    return {
      isValidating: false,
      isValid: null,
      error: null
    }
  }

  try {
    // Step 1: Validate identifier format (base58, 32 bytes)
    if (!validateIdentifier(identifier)) {
      return {
        isValidating: false,
        isValid: false,
        error: 'Invalid identifier format. Must be a valid 32-byte base58 encoded string'
      }
    }

    // Step 2: Check if identity exists on the network
    try {
      await platformExplorerClient.fetchIdentity(identifier, (currentNetwork ?? 'testnet') as NetworkType)
      
      return {
        isValidating: false,
        isValid: true,
        error: null
      }
    } catch (networkError) {
      // If platform explorer fails, try SDK
      try {
        const identity = await sdk.identities.getIdentityByIdentifier(identifier)
        if (identity) {
          return {
            isValidating: false,
            isValid: true,
            error: null
          }
        } else {
          return {
            isValidating: false,
            isValid: false,
            error: 'Identity not found on the network'
          }
        }
      } catch (sdkError) {
        return {
          isValidating: false,
          isValid: false,
          error: 'Identity not found on the network'
        }
      }
    }
  } catch (error) {
    return {
      isValidating: false,
      isValid: false,
      error: 'Failed to validate recipient identifier'
    }
  }
}
