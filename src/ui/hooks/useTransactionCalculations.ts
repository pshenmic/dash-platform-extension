import { useMemo } from 'react'
import type { TokenData } from '../../types'
import { creditsToDashBigInt } from '../../utils'
import { ESTIMATED_FEES } from '../constants/transaction'
import { formatTokenAmount } from '../../utils/transactionFormatters'

interface UseTransactionCalculationsParams {
  selectedAsset: string
  amount: string
  balance: bigint | null
  rate: number | null
  currentNetwork: string | null
  token?: TokenData
}

interface TransactionCalculations {
  getEstimatedFee: () => string
  getEstimatedFeeBigInt: () => bigint
  getTotalAmount: () => string
  getTotalAmountUnit: () => string
  getWillBeSentAmount: () => string
  getWillBeSentUnit: () => string
  getBalanceUSDValue: () => string | null
}

export function useTransactionCalculations ({
  selectedAsset,
  amount,
  balance,
  rate,
  currentNetwork,
  token
}: UseTransactionCalculationsParams): TransactionCalculations {
  const network = (currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'
  const assetType = selectedAsset === 'credits' ? 'credits' : 'tokens'

  const getEstimatedFeeBigInt = useMemo(() => {
    return (): bigint => ESTIMATED_FEES[network][assetType]
  }, [network, assetType])

  const getEstimatedFee = useMemo(() => {
    return (): string => {
      const fee = ESTIMATED_FEES[network][assetType]
      return `~${fee.toLocaleString()}`
    }
  }, [network, assetType])

  const getTotalAmount = useMemo(() => {
    return (): string => {
      const fee = getEstimatedFeeBigInt()

      if (selectedAsset === 'credits') {
        if (amount !== '') {
          const amountInCredits = BigInt(Math.floor(Number(amount)))
          const total = amountInCredits + fee
          return total.toLocaleString()
        }
        // If no amount entered, show only fee
        return fee.toLocaleString()
      }

      // For tokens, show the token amount (if entered)
      if (amount !== '' && amount !== '0') {
        return formatTokenAmount(amount)
      }

      return '0'
    }
  }, [selectedAsset, amount, getEstimatedFeeBigInt])

  const getTotalAmountUnit = useMemo(() => {
    return (): string => {
      if (selectedAsset === 'credits') {
        return 'Credits'
      }

      // For tokens, get token name
      if (token != null) {
        const tokenName = token.localizations?.en?.singularForm ?? token.identifier
        return tokenName.charAt(0).toUpperCase() + tokenName.slice(1)
      }

      return 'Tokens'
    }
  }, [selectedAsset, token])

  const getWillBeSentAmount = useMemo(() => {
    return (): string => {
      if (amount !== '' && amount !== '0') {
        if (selectedAsset === 'credits') {
          const amountInCredits = BigInt(Math.floor(Number(amount)))
          return amountInCredits.toLocaleString()
        }

        // For tokens
        return formatTokenAmount(amount)
      }

      return '0'
    }
  }, [amount, selectedAsset])

  const getWillBeSentUnit = useMemo(() => {
    return (): string => {
      return getTotalAmountUnit()
    }
  }, [getTotalAmountUnit])

  const getBalanceUSDValue = useMemo(() => {
    return (): string | null => {
      if (rate == null) return null

      if (selectedAsset === 'credits' && balance !== null) {
        const dashValue = creditsToDashBigInt(balance)
        const dashAmount = Number(dashValue)
        const usdValue = dashAmount * rate
        return `~ $${usdValue.toFixed(3)}`
      }

      return null
    }
  }, [rate, selectedAsset, balance])

  return {
    getEstimatedFee,
    getEstimatedFeeBigInt,
    getTotalAmount,
    getTotalAmountUnit,
    getWillBeSentAmount,
    getWillBeSentUnit,
    getBalanceUSDValue
  }
}
