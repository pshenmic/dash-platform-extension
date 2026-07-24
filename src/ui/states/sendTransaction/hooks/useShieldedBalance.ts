import { useCallback, useState } from 'react'
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

  const unlock = useCallback(async (password: string): Promise<void> => {
    if (password === '') {
      setError('Password must be provided')
      return
    }

    setIsUnlocking(true)
    setError(null)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)

      if (!passwordCheck.success) {
        setError('Invalid password')
        return
      }

      setInfo(await extensionAPI.getShieldedBalance(password))
    } catch (err) {
      console.error('Failed to load shielded balance:', err)
      setError(err instanceof Error ? err.message : 'Failed to load shielded balance')
      return
    } finally {
      setIsUnlocking(false)
    }

    setIsWarmingProver(true)

    try {
      await extensionAPI.initShield()
    } catch (err) {
      console.log('Shielded prover warm-up failed:', err)
    } finally {
      setIsWarmingProver(false)
    }
  }, [extensionAPI])

  return {
    info,
    balance: info != null ? BigInt(info.balance) : null,
    isUnlocking,
    isWarmingProver,
    error,
    unlock,
    clearError: useCallback(() => setError(null), [])
  }
}
