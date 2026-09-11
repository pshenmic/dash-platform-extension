import { useCallback, useEffect, useRef, useState } from 'react'
import { useExtensionAPI } from './useExtensionAPI'
import { usePlatformExplorerClient } from './usePlatformExplorerClient'
import type { AddressData } from '../components/addresses'
import type { NetworkType } from '../../types'
import type { PlatformAddressBalance } from '../../types/messages/response/GetPlatformAddressesInfosResponse'
import { PLATFORM_ADDRESS_GENERATE_BATCH } from '../../constants'

// Loaded lists live here for as long as the popup is open, keyed by network and
// wallet. Every consumer of the hook shares them, so opening Receive or coming
// back to a dashboard tab does not refetch. Balances go stale on purpose: the
// cache is dropped only by an explicit reload, a generation, or a key change.
const listCache = new Map<string, AddressData[]>()

function cacheKey (network: NetworkType, walletId?: string | null): string {
  return `${network}:${walletId ?? ''}`
}

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
  /** Drops the cached list and fetches it again. */
  reload: () => Promise<void>
}

// Owns the platform addresses list and the generation flow.
export function usePlatformAddresses (
  currentNetwork?: NetworkType | null,
  walletId?: string | null
): UsePlatformAddressesResult {
  const extensionAPI = useExtensionAPI()
  const platformExplorerClient = usePlatformExplorerClient()
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)
  // Addresses belong to one wallet on one network. A response for the previous
  // pair must never repaint the list - on Receive that would be a QR code for
  // the wallet the user just left.
  const epochRef = useRef(0)

  // Fetch the created addresses and enrich with balances and transaction counts.
  const refreshList = useCallback(async (): Promise<void> => {
    const epoch = epochRef.current
    const network = currentNetwork ?? 'testnet'
    const key = cacheKey(network, walletId)
    const created = await extensionAPI.listPlatformAddresses()
    if (epoch !== epochRef.current) return

    const initial: AddressData[] = created.map((entry) => ({
      index: entry.index,
      derivationPath: entry.derivationPath,
      address: entry.address,
      balance: null,
      totalTxs: null,
      loading: true
    }))

    setAddresses(initial)

    if (initial.length === 0) {
      listCache.set(key, [])
      return
    }

    const infos = await extensionAPI.getPlatformAddressesInfos(initial.map((item) => item.address))
      .catch((): PlatformAddressBalance[] => [])

    if (epoch !== epochRef.current) return

    const infoByAddress = new Map(infos.map((info) => [info.address, info]))

    // The explorer knows nothing about an address that was never funded and
    // never spent from, and answers with a 404 the browser logs no matter how
    // we handle it. So the explorer is asked only about addresses the batch
    // proved to have history: a 0/0 address counts zero transactions locally,
    // and one the batch could not describe at all stays unknown rather than
    // costing a request that would most likely 404.
    const txCounts = await Promise.all(initial.map(async (item) => {
      const info = infoByAddress.get(item.address)

      if (info == null) return null
      if (info.balance === '0' && info.nonce === 0) return 0

      try {
        const data = await platformExplorerClient.fetchAddress(item.address, network)
        return data.totalTxs ?? null
      } catch {
        return null
      }
    }))

    if (epoch !== epochRef.current) return

    const loaded = initial.map((item, i) => ({
      ...item,
      balance: infoByAddress.get(item.address)?.balance ?? null,
      totalTxs: txCounts[i],
      loading: false
    }))

    listCache.set(key, loaded)
    setAddresses(loaded)
  }, [extensionAPI, platformExplorerClient, currentNetwork, walletId])

  const loadList = useCallback(async (): Promise<void> => {
    const epoch = epochRef.current
    loadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      await refreshList()
      if (epoch === epochRef.current) setHasLoaded(true)
    } catch (err) {
      if (epoch === epochRef.current) setError(err instanceof Error ? err.message : 'Failed to load addresses')
    } finally {
      loadingRef.current = false
      if (epoch === epochRef.current) setIsLoading(false)
    }
  }, [refreshList])

  // Reload whenever the wallet or the network changes, not just on mount. A
  // list already loaded for this pair is served from the cache instead.
  useEffect(() => {
    epochRef.current += 1

    setNeedsPassword(false)
    setError(null)

    const cached = listCache.get(cacheKey(currentNetwork ?? 'testnet', walletId))

    if (cached != null) {
      setAddresses(cached)
      setHasLoaded(true)
      setIsLoading(false)
      return
    }

    setAddresses([])
    setHasLoaded(false)

    void loadList()
  }, [currentNetwork, walletId, loadList])

  // Generate the next batch of addresses
  const generate = useCallback(async (): Promise<void> => {
    setIsGenerating(true)
    setError(null)

    const generated = await extensionAPI.generatePlatformAddresses(undefined, PLATFORM_ADDRESS_GENERATE_BATCH)
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
  // first batch. Subsequent generations no longer need the password.
  // Resolves with a password error message, or null on success.
  const generateWithPassword = useCallback(async (password: string): Promise<string | null> => {
    setIsGenerating(true)
    setError(null)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        return 'Invalid password'
      }

      await extensionAPI.generatePlatformAddresses(password, PLATFORM_ADDRESS_GENERATE_BATCH)
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

  // Explicit refresh - the only thing that invalidates an already loaded list.
  const reload = useCallback(async (): Promise<void> => {
    listCache.delete(cacheKey(currentNetwork ?? 'testnet', walletId))
    await loadList()
  }, [currentNetwork, walletId, loadList])

  return {
    addresses,
    isLoading,
    isGenerating,
    hasLoaded,
    error,
    needsPassword,
    generate,
    generateWithPassword,
    cancelPassword,
    reload
  }
}
