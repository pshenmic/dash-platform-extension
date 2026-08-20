import { useCallback, useEffect, useRef, useState } from 'react'
import { useExtensionAPI } from './useExtensionAPI'
import { usePlatformExplorerClient } from './usePlatformExplorerClient'
import type { AddressData } from '../components/addresses'
import type { NetworkType } from '../../types'
import type { PlatformAddressBalance } from '../../types/messages/response/GetPlatformAddressesInfosResponse'

export interface UsePlatformAddressesResult {
  addresses: AddressData[]
  isLoading: boolean
  isGenerating: boolean
  hasLoaded: boolean
  error: string | null
  needsPassword: boolean
  generate: () => Promise<void>
  generateWithPassword: (password: string) => Promise<string | null>
  cancelPassword: () => void
}

// Owns the platform addresses list and the generation flow.
export function usePlatformAddresses (currentNetwork?: NetworkType | null): UsePlatformAddressesResult {
  const extensionAPI = useExtensionAPI()
  const platformExplorerClient = usePlatformExplorerClient()
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  // Fetch the created addresses and enrich with balances and transaction counts.
  const refreshList = useCallback(async (): Promise<void> => {
    const created = await extensionAPI.listPlatformAddresses()

    const initial: AddressData[] = created.map((entry) => ({
      index: entry.index,
      derivationPath: entry.derivationPath,
      address: entry.address,
      balance: null,
      totalTxs: null,
      loading: true
    }))

    setAddresses(initial)

    if (initial.length === 0) return

    const network = currentNetwork ?? 'testnet'

    const [infos, txCounts] = await Promise.all([
      extensionAPI.getPlatformAddressesInfos(initial.map((item) => item.address))
        .catch((): PlatformAddressBalance[] => []),
      Promise.all(initial.map(async (item) => {
        try {
          const data = await platformExplorerClient.fetchAddress(item.address, network)
          return data.totalTxs ?? 0
        } catch {
          return null
        }
      }))
    ])

    const balanceByAddress = new Map(infos.map((info) => [info.address, info.balance]))

    setAddresses(initial.map((item, i) => ({
      ...item,
      balance: balanceByAddress.get(item.address) ?? null,
      totalTxs: txCounts[i],
      loading: false
    })))
  }, [extensionAPI, platformExplorerClient, currentNetwork])

  // Load the existing list on mount.
  useEffect(() => {
    const loadList = async (): Promise<void> => {
      if (loadingRef.current) return
      loadingRef.current = true
      setIsLoading(true)
      setError(null)

      try {
        await refreshList()
        setHasLoaded(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load addresses')
      } finally {
        setIsLoading(false)
        loadingRef.current = false
      }
    }

    void loadList()
  }, [])

  // Generate the next address
  const generate = useCallback(async (): Promise<void> => {
    setIsGenerating(true)
    setError(null)

    const generated = await extensionAPI.generatePlatformAddresses()
      .then(() => true)
      .catch(() => false)

    if (!generated) {
      setNeedsPassword(true)
      setIsGenerating(false)
      return
    }

    setNeedsPassword(false)

    try {
      await refreshList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load addresses')
    } finally {
      setIsGenerating(false)
    }
  }, [extensionAPI, refreshList])

  // Legacy wallets: initialize the xpub with the password and generate the
  // first address. Subsequent generations no longer need the password.
  // Resolves with a password error message, or null on success.
  const generateWithPassword = useCallback(async (password: string): Promise<string | null> => {
    setIsGenerating(true)
    setError(null)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        return 'Invalid password'
      }

      await extensionAPI.generatePlatformAddresses(password)
      setNeedsPassword(false)
      await refreshList()
      return null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create address')
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [extensionAPI, refreshList])

  const cancelPassword = useCallback((): void => {
    setNeedsPassword(false)
  }, [])

  return {
    addresses,
    isLoading,
    isGenerating,
    hasLoaded,
    error,
    needsPassword,
    generate,
    generateWithPassword,
    cancelPassword
  }
}
