import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useExtensionAPI } from '../../../hooks'
import type { GetShieldedBalanceResponse } from '../../../../types/messages/response/GetShieldedBalanceResponse'
import type { GetShieldedAddressesResponse } from '../../../../types/messages/response/GetShieldedAddressesResponse'
import type { ShieldedAddressEntry } from '../types'
import type { ShieldedSpendKind } from '../../../../types/ShieldedSpendKind'

type DerivedShieldedAddresses = GetShieldedAddressesResponse['addresses']

interface UseShieldedBalanceResult {
  info: GetShieldedBalanceResponse | null
  balance: bigint | null
  addresses: ShieldedAddressEntry[]
  isUnlocking: boolean
  isWarmingProver: boolean
  error: string | null
  unlock: (password: string) => Promise<string | null>
  clearError: () => void
  spendFees: Partial<Record<ShieldedSpendKind, bigint>>
}

const ESTIMATED_SPEND_TYPES: ShieldedSpendKind[] = ['transfer', 'unshield']

/**
 * Unlocks the wallet's shielded balance for the transfer form.
 */
export function useShieldedBalance (): UseShieldedBalanceResult {
  const extensionAPI = useExtensionAPI()
  const [info, setInfo] = useState<GetShieldedBalanceResponse | null>(null)
  const [derived, setDerived] = useState<DerivedShieldedAddresses>([])
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isWarmingProver, setIsWarmingProver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [spendFees, setSpendFees] = useState<Partial<Record<ShieldedSpendKind, bigint>>>({})
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  const unlock = useCallback(async (password: string): Promise<string | null> => {
    if (password === '') {
      setError('Password must be provided')
      return 'Password must be provided'
    }

    setIsUnlocking(true)
    setError(null)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)

      if (!mountedRef.current) return null

      if (!passwordCheck.success) {
        setError('Invalid password')
        return 'Invalid password'
      }

      // The breakdown covers only funded addresses; the derived list adds
      // the empty ones, and losing it is not fatal.
      const [addressesResult, balanceResult, ...feeResults] = await Promise.allSettled([
        extensionAPI.getShieldedAddresses(password),
        extensionAPI.getShieldedBalance(password),
        ...ESTIMATED_SPEND_TYPES.map(async spendType => await extensionAPI.estimateShieldedFee(spendType, password))
      ])

      if (!mountedRef.current) return null

      if (balanceResult.status === 'rejected') {
        throw balanceResult.reason instanceof Error ? balanceResult.reason : new Error('Failed to load shielded balance')
      }

      if (addressesResult.status === 'rejected') {
        console.log('Failed to derive shielded addresses:', addressesResult.reason)
      }

      setSpendFees(Object.fromEntries(ESTIMATED_SPEND_TYPES.flatMap((spendType, index) => {
        const result = feeResults[index]
        return result.status === 'fulfilled' ? [[spendType, BigInt(result.value.feeCredits)]] : []
      })))
      setDerived(addressesResult.status === 'fulfilled' ? addressesResult.value : [])
      setInfo(balanceResult.value)
    } catch (err) {
      console.error('Failed to load shielded balance:', err)
      const message = err instanceof Error ? err.message : 'Failed to load shielded balance'
      if (mountedRef.current) setError(message)
      return message
    } finally {
      if (mountedRef.current) setIsUnlocking(false)
    }

    if (mountedRef.current) setIsWarmingProver(true)

    try {
      await extensionAPI.initShield()
    } catch (err) {
      console.log('Shielded prover warm-up failed:', err)
    } finally {
      if (mountedRef.current) setIsWarmingProver(false)
    }

    return null
  }, [extensionAPI])

  // Defensive: a malformed `info.balance` must not throw during render.
  const balance = useMemo((): bigint | null => {
    if (info == null) return null
    try {
      return BigInt(info.balance)
    } catch {
      return null
    }
  }, [info])

  // Every derived address with its share of the balance, funded ones first.
  // Malformed rows are dropped rather than thrown on, like `balance` above.
  const addresses = useMemo((): ShieldedAddressEntry[] => {
    if (info == null) return []

    const funded = new Map<string, ShieldedAddressEntry>()

    for (const entry of Array.isArray(info.byAddress) ? info.byAddress : []) {
      try {
        funded.set(entry.address, {
          address: entry.address,
          diversifierIndex: entry.diversifierIndex,
          balance: BigInt(entry.balance),
          spendableNotes: entry.spendableNotes
        })
      } catch {
        // Malformed balance - skip the row rather than break the whole list.
      }
    }

    // Every derived address is offered, funded or not; notes received outside
    // the derived window (no known index) are appended after them.
    const rows = derived.map((entry): ShieldedAddressEntry => funded.get(entry.address) ?? {
      address: entry.address,
      diversifierIndex: entry.diversifierIndex,
      balance: 0n,
      spendableNotes: 0
    })
    const knownAddresses = new Set(derived.map(entry => entry.address))

    rows.push(...Array.from(funded.values()).filter(entry => !knownAddresses.has(entry.address)))

    return rows.sort((a, b) => {
      if (a.balance !== b.balance) return a.balance > b.balance ? -1 : 1

      return (a.diversifierIndex ?? Number.MAX_SAFE_INTEGER) - (b.diversifierIndex ?? Number.MAX_SAFE_INTEGER)
    })
  }, [info, derived])

  return {
    info,
    balance,
    addresses,
    isUnlocking,
    isWarmingProver,
    error,
    unlock,
    clearError: useCallback(() => setError(null), []),
    spendFees
  }
}
