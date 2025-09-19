import { useEffect, useState } from 'react'
import { useAsyncState } from './useAsyncState'
import { useSdk } from './useSdk'
import { useExtensionAPI } from './useExtensionAPI'
import { loadSigningKeys as getSigningKeys } from '../../utils'
import type { PublicKeyInfo } from '../components/keys'

interface UseSigningKeysOptions {
  identity: string | null
}

interface UseSigningKeysResult {
  signingKeys: PublicKeyInfo[]
  selectedSigningKey: string | null
  setSelectedSigningKey: (keyId: string | null) => void
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Custom hook for managing signing keys state and selection
 * Handles loading, caching, and automatic selection of the first available key
 */
export const useSigningKeys = (options: UseSigningKeysOptions): UseSigningKeysResult => {
  const { identity } = options

  const sdk = useSdk()
  const extensionAPI = useExtensionAPI()
  const [selectedSigningKey, setSelectedSigningKey] = useState<string | null>(null)
  const [signingKeysState, loadSigningKeys] = useAsyncState<PublicKeyInfo[]>()

  // Load signing keys when dependencies change
  useEffect(() => {
    if (identity == null) {
      setSelectedSigningKey(null)
      return
    }

    loadSigningKeys(() => getSigningKeys(sdk, extensionAPI, identity))
      .catch(e => console.log('useSigningKeys error', e))
  }, [identity, sdk, extensionAPI, loadSigningKeys])

  // Reset selection when no keys are available
  useEffect(() => {
    if (signingKeysState.data == null || signingKeysState.data.length === 0) {
      setSelectedSigningKey(null)
    }
  }, [signingKeysState.data])

  return {
    signingKeys: signingKeysState.data ?? [],
    selectedSigningKey,
    setSelectedSigningKey,
    loading: signingKeysState.loading,
    error: signingKeysState.error,
    reload: () => {
      if (identity != null) {
        loadSigningKeys(() => getSigningKeys(sdk, extensionAPI, identity))
          .catch(e => console.log('useSigningKeys reload error', e))
      }
    }
  }
}
