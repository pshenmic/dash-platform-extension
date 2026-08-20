import { useCallback, useEffect, useState } from 'react'
import { useExtensionAPI } from './useExtensionAPI'
import { usePlatformExplorerClient } from './usePlatformExplorerClient'
import type { ShieldedAddressData } from '../components/addresses'
import type { NetworkType } from '../../types'
import type { GetShieldedAddressesResponse } from '../../types/messages/response/GetShieldedAddressesResponse'
import type { GetShieldedBalanceResponse } from '../../types/messages/response/GetShieldedBalanceResponse'

type ShieldedAddressList = GetShieldedAddressesResponse['addresses']
type ShieldedBalance = GetShieldedBalanceResponse

export interface UseShieldedAddressesResult {
  rows: ShieldedAddressData[]
  balance: ShieldedBalance | null
  balanceUnavailable: boolean
  rate: number | null
  hasLoaded: boolean
  isLoading: boolean
  isGenerating: boolean
  error: string | null
  load: (password: string) => Promise<string | null>
  generate: (password: string) => Promise<string | null>
}

// Merges the derived addresses with the per-address balances.
const buildRows = (
  addresses: ShieldedAddressList,
  balance: ShieldedBalance | null
): ShieldedAddressData[] => {
  const unmatched = new Map((balance?.byAddress ?? []).map((entry) => [entry.address, entry]))

  const derived = addresses.map((item) => {
    const entry = unmatched.get(item.address)
    unmatched.delete(item.address)

    return {
      address: item.address,
      diversifierIndex: item.diversifierIndex,
      balance: balance == null ? null : entry?.balance ?? '0',
      spendableNotes: balance == null ? null : entry?.spendableNotes ?? 0
    }
  })

  const external = [...unmatched.values()].map((entry) => ({
    address: entry.address,
    diversifierIndex: entry.diversifierIndex,
    balance: entry.balance,
    spendableNotes: entry.spendableNotes
  }))

  return [...derived, ...external]
}

// Owns the shielded addresses list, its balance and the generation flow.
export function useShieldedAddresses (currentNetwork?: NetworkType | null): UseShieldedAddressesResult {
  const extensionAPI = useExtensionAPI()
  const platformExplorerClient = usePlatformExplorerClient()
  const [addresses, setAddresses] = useState<ShieldedAddressList>([])
  const [balance, setBalance] = useState<ShieldedBalance | null>(null)
  const [balanceUnavailable, setBalanceUnavailable] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rate, setRate] = useState<number | null>(null)

  // Fetch USD rate per Dash
  useEffect(() => {
    const network = currentNetwork ?? 'testnet'
    platformExplorerClient.fetchRate(network)
      .then(setRate)
      .catch(() => setRate(null))
  }, [currentNetwork, platformExplorerClient])

  // Fetch the addresses and their balances. Both need the password every time,
  // the seed is never kept unlocked.
  const refreshList = useCallback(async (password: string): Promise<string | null> => {
    setBalanceUnavailable(false)

    const [addrResult, balanceResult] = await Promise.allSettled([
      extensionAPI.getShieldedAddresses(password),
      extensionAPI.getShieldedBalance(password)
    ])

    if (addrResult.status === 'rejected') {
      setError(addrResult.reason instanceof Error ? addrResult.reason.message : 'Failed to load shielded addresses')
      return null
    }

    setAddresses(addrResult.value)
    setHasLoaded(true)

    if (balanceResult.status === 'fulfilled') {
      setBalance(balanceResult.value)
    } else {
      setBalanceUnavailable(true)
    }

    return null
  }, [extensionAPI])

  const load = useCallback(async (password: string): Promise<string | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        return 'Invalid password'
      }

      return await refreshList(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shielded addresses')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [extensionAPI, refreshList])

  // Generate the next diversified address and reload the list.
  const generate = useCallback(async (password: string): Promise<string | null> => {
    setIsGenerating(true)
    setError(null)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        return 'Invalid password'
      }

      await extensionAPI.generateShieldedAddresses(password)

      return await refreshList(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shielded address')
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [extensionAPI, refreshList])

  return {
    rows: buildRows(addresses, balance),
    balance,
    balanceUnavailable,
    rate,
    hasLoaded,
    isLoading,
    isGenerating,
    error,
    load,
    generate
  }
}
