import { useEffect, useState, useRef, useMemo } from 'react'
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
 * Hook for managing signing keys state and selection
 * Handles loading, caching, and automatic selection of the first available key
 */
export const useSigningKeys = (options: UseSigningKeysOptions): UseSigningKeysResult => {
  const { identity } = options

  const sdk = useSdk()
  const extensionAPI = useExtensionAPI()
  const [selectedSigningKey, setSelectedSigningKey] = useState<string | null>(null)
  const [signingKeysState, loadSigningKeys] = useAsyncState<PublicKeyInfo[]>()
  const loadSigningKeysRef = useRef(loadSigningKeys)
  loadSigningKeysRef.current = loadSigningKeys

  // Load signing keys when dependencies change
  useEffect(() => {
    if (identity == null) {
      setSelectedSigningKey(null)
      return
    }

    loadSigningKeysRef.current(async () => await getSigningKeys(sdk, extensionAPI, identity))
      .catch(e => console.log('useSigningKeys error', e))
  }, [identity, sdk, extensionAPI])

  const signingKeys = useMemo(() => signingKeysState.data ?? [], [signingKeysState.data])

  // Reset selection when no keys are available
  useEffect(() => {
    if (signingKeys.length === 0) {
      setSelectedSigningKey(null)
    }
  }, [signingKeys])

  return {
    signingKeys,
    selectedSigningKey,
    setSelectedSigningKey,
    loading: signingKeysState.loading,
    error: signingKeysState.error,
    reload: () => {
      if (identity != null) {
        loadSigningKeysRef.current(async () => await getSigningKeys(sdk, extensionAPI, identity))
          .catch(e => console.log('useSigningKeys reload error', e))
      }
    }
  }
}
