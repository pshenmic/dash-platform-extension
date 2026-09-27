import { useCallback, useEffect, useRef, useState } from 'react'
import { useExtensionAPI } from './useExtensionAPI'
import { usePlatformExplorerClient } from './usePlatformExplorerClient'
import type { ShieldedAddressData } from '../components/addresses'
import type { NetworkType } from '../../types'
import type { ShieldedSyncState } from '../../types/messages/response/GetShieldedSyncStateResponse'
import { SHIELDED_ADDRESS_GENERATE_BATCH } from '../../constants'
import { SHIELDED_SYNC_POLL_MS } from '../constants'
import { toCreditsBigInt } from '../../utils'
import { isShieldedSyncRunning, onShieldedSyncChange, trackShieldedSync } from '../utils/shieldedSync'

export interface UseShieldedAddressesResult {
  rows: ShieldedAddressData[]
  // Unspent credits, null until the wallet has been synced.
  balance: string | null
  spendableNotes: number
  totalNotes: number
  rate: number | null
  // When incoming notes were last looked for, null if never.
  updatedAt: number | null
  hasLoaded: boolean
  isSyncing: boolean
  isRefreshing: boolean
  isGenerating: boolean
  error: string | null
  sync: (password: string) => Promise<string | null>
  generate: (password: string) => Promise<string | null>
  refresh: () => Promise<void>
}

interface AddressTotals {
  address: string
  diversifierIndex: number | null
  balance: bigint
  spendableNotes: number
}

const toRow = (totals: AddressTotals): ShieldedAddressData => ({
  ...totals,
  balance: totals.balance.toString()
})

// Derived addresses with their unspent notes, then funded addresses outside the derived window.
const buildRows = (state: ShieldedSyncState): ShieldedAddressData[] => {
  const funded = new Map<string, AddressTotals>()

  for (const note of state.notes) {
    if (note.isSpent) continue

    const totals = funded.get(note.address) ??
      { address: note.address, diversifierIndex: note.diversifierIndex, balance: 0n, spendableNotes: 0 }

    totals.balance += toCreditsBigInt(note.value) ?? 0n
    totals.spendableNotes += 1
    funded.set(note.address, totals)
  }

  const derived = state.addresses.map(item => {
    const totals = funded.get(item.address)
    funded.delete(item.address)

    return toRow({
      address: item.address,
      diversifierIndex: item.diversifierIndex,
      balance: totals?.balance ?? 0n,
      spendableNotes: totals?.spendableNotes ?? 0
    })
  })

  return [...derived, ...[...funded.values()].map(toRow)]
}

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback

// Shielded addresses and balance from the stored notes, readable without the password.
export function useShieldedAddresses (
  currentNetwork?: NetworkType | null,
  walletId?: string | null
): UseShieldedAddressesResult {
  const extensionAPI = useExtensionAPI()
  const platformExplorerClient = usePlatformExplorerClient()
  const network = currentNetwork ?? undefined
  const wallet = walletId ?? undefined
  const [state, setState] = useState<ShieldedSyncState | null>(null)
  const [isLocalSync, setIsLocalSync] = useState(isShieldedSyncRunning)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const requestRef = useRef(0)

  const reload = useCallback(async (): Promise<void> => {
    const request = ++requestRef.current

    try {
      const next = await extensionAPI.getShieldedSyncState(undefined, wallet, network)
      if (request === requestRef.current) setState(next)
    } catch (err) {
      if (request === requestRef.current) setError(errorMessage(err, 'Failed to load shielded addresses'))
    }
  }, [extensionAPI, wallet, network])

  useEffect(() => {
    setState(null)
    setError(null)
    void reload()
  }, [reload])

  useEffect(() => onShieldedSyncChange(() => {
    const running = isShieldedSyncRunning()
    setIsLocalSync(running)
    if (!running) void reload()
  }), [reload])

  // A sync started before this popup opened is only visible through the stored phase.
  useEffect(() => {
    if (state?.phase !== 'syncing' || isLocalSync) return

    const timer = setTimeout(() => { void reload() }, SHIELDED_SYNC_POLL_MS)

    return () => { clearTimeout(timer) }
  }, [state, isLocalSync, reload])

  useEffect(() => {
    platformExplorerClient.fetchRate(currentNetwork ?? 'testnet')
      .then(setRate)
      .catch(() => setRate(null))
  }, [currentNetwork, platformExplorerClient])

  const runSync = useCallback(async (password: string): Promise<string | null> => {
    const response = await trackShieldedSync(extensionAPI.syncShieldedNotes(password, undefined, wallet, network))
    const failed = response.wallets.find(entry => entry.error != null)

    return failed?.error ?? null
  }, [extensionAPI, wallet, network])

  const sync = useCallback(async (password: string): Promise<string | null> => {
    setError(null)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) return 'Invalid password'

      const syncError = await runSync(password)
      if (syncError != null) setError(syncError)
    } catch (err) {
      setError(errorMessage(err, 'Failed to sync shielded addresses'))
    }

    return null
  }, [extensionAPI, runSync])

  const generate = useCallback(async (password: string): Promise<string | null> => {
    setIsGenerating(true)
    setError(null)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) return 'Invalid password'

      await extensionAPI.generateShieldedAddresses(password, SHIELDED_ADDRESS_GENERATE_BATCH)

      const syncError = await runSync(password)
      if (syncError != null) setError(syncError)
    } catch (err) {
      setError(errorMessage(err, 'Failed to create shielded addresses'))
    } finally {
      setIsGenerating(false)
    }

    return null
  }, [extensionAPI, runSync])

  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true)

    try {
      await extensionAPI.refreshShieldedNotes(undefined, wallet, network)
      await reload()
    } catch (err) {
      console.log('refreshShieldedNotes error', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [extensionAPI, wallet, network, reload])

  const hasLoaded = state?.updatedAt != null

  return {
    rows: hasLoaded ? buildRows(state) : [],
    balance: hasLoaded ? state.balance : null,
    spendableNotes: state?.spendableNotes ?? 0,
    totalNotes: state?.notes.length ?? 0,
    rate,
    updatedAt: state?.updatedAt ?? null,
    hasLoaded,
    isSyncing: isLocalSync || state?.phase === 'syncing',
    isRefreshing,
    isGenerating,
    error,
    sync,
    generate,
    refresh
  }
}
