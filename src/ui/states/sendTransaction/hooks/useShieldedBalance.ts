import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useExtensionAPI } from '../../../hooks'
import type { GetShieldedBalanceResponse } from '../../../../types/messages/response/GetShieldedBalanceResponse'

interface UseShieldedBalanceResult {
  info: GetShieldedBalanceResponse | null
  balance: bigint | null
  isUnlocking: boolean
  isWarmingProver: boolean
  error: string | null
  unlock: (password: string) => Promise<void>
  clearError: () => void
}

/**
 * Unlocks the wallet's shielded balance for the transfer form.
 */
export function useShieldedBalance (): UseShieldedBalanceResult {
  const extensionAPI = useExtensionAPI()
  const [info, setInfo] = useState<GetShieldedBalanceResponse | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isWarmingProver, setIsWarmingProver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  const unlock = useCallback(async (password: string): Promise<void> => {
    if (password === '') {
      setError('Password must be provided')
      return
    }

    setIsUnlocking(true)
    setError(null)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)

      if (!mountedRef.current) return

      if (!passwordCheck.success) {
        setError('Invalid password')
        return
      }

      const shieldedBalance = await extensionAPI.getShieldedBalance(password)
      if (!mountedRef.current) return
      setInfo(shieldedBalance)
    } catch (err) {
      console.error('Failed to load shielded balance:', err)
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load shielded balance')
      }
      return
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

  return {
    info,
    balance,
    isUnlocking,
    isWarmingProver,
    error,
    unlock,
    clearError: useCallback(() => setError(null), [])
  }
}
