import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useExtensionAPI } from '../../../hooks'
import type { GetShieldedBalanceResponse } from '../../../../types/messages/response/GetShieldedBalanceResponse'
import type { ShieldedSpendKind } from '../../../../types/ShieldedSpendKind'
import { SHIELDED_SPEND_KINDS } from '../../../../utils'
import type { ShieldedSpendEstimate } from '../../../../utils'

interface UseShieldedBalanceResult {
  balance: bigint | null
  isUnlocking: boolean
  isWarmingProver: boolean
  error: string | null
  unlock: (password: string) => Promise<string | null>
  spendEstimates: Partial<Record<ShieldedSpendKind, ShieldedSpendEstimate>>
}

// Unlocks the wallet's shielded balance for the send wizard.
export function useShieldedBalance (): UseShieldedBalanceResult {
  const extensionAPI = useExtensionAPI()
  const [info, setInfo] = useState<GetShieldedBalanceResponse | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isWarmingProver, setIsWarmingProver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [spendEstimates, setSpendEstimates] = useState<Partial<Record<ShieldedSpendKind, ShieldedSpendEstimate>>>({})
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

      const [balanceResult, ...feeResults] = await Promise.allSettled([
        extensionAPI.getShieldedBalance(password),
        ...SHIELDED_SPEND_KINDS.map(async spendType => await extensionAPI.estimateShieldedFee(spendType, password))
      ])

      if (!mountedRef.current) return null

      if (balanceResult.status === 'rejected') {
        throw balanceResult.reason instanceof Error ? balanceResult.reason : new Error('Failed to load shielded balance')
      }

      // Without an amount each estimate describes the largest spend: its amount, fee and notes.
      setSpendEstimates(Object.fromEntries(SHIELDED_SPEND_KINDS.flatMap((spendType, index) => {
        const result = feeResults[index]
        if (result.status === 'rejected') return []
        const { maxAmountCredits, feeCredits, notesCount } = result.value
        return [[spendType, { amountCredits: BigInt(maxAmountCredits), feeCredits: BigInt(feeCredits), notesCount }]]
      })))
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

  return {
    balance,
    isUnlocking,
    isWarmingProver,
    error,
    unlock,
    spendEstimates
  }
}
