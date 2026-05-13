import { useState, useCallback } from 'react'
import {
  parseDecimalInput,
  creditsToDash,
  multiplyBigIntByPercentage
} from '../../utils'
import { ESTIMATED_FEES, MIN_CREDIT_WITHDRAWAL, MAX_CREDIT_WITHDRAWAL } from '../constants/transaction'

interface WithdrawalFormData {
  amount: string
  recipientAddress: string
}

interface UseWithdrawalFormReturn {
  formData: WithdrawalFormData
  equivalentAmount: string
  equivalentCurrency: 'usd' | 'dash'
  error: string | null
  handleAmountChange: (value: string) => void
  handleEquivalentChange: (value: string) => void
  handleEquivalentCurrencyChange: (currency: 'usd' | 'dash') => void
  handleQuickAmount: (percentage: number) => void
  handleAddressChange: (value: string) => void
  setError: (err: string | null) => void
  setEquivalentAmount: (v: string) => void
}

export function useWithdrawalForm (
  balance: bigint | null,
  rate: number | null,
  currentNetwork: string | null
): UseWithdrawalFormReturn {
  const [formData, setFormData] = useState<WithdrawalFormData>({ amount: '', recipientAddress: '' })
  const [equivalentAmount, setEquivalentAmount] = useState('')
  const [equivalentCurrency, setEquivalentCurrency] = useState<'usd' | 'dash'>('usd')
  const [error, setError] = useState<string | null>(null)

  const updateEquivalent = useCallback((creditsStr: string, currency: 'usd' | 'dash', r: number | null): void => {
    const num = Number(creditsStr)
    if (isNaN(num) || num <= 0) { setEquivalentAmount(''); return }
    const dashValue = creditsToDash(BigInt(Math.floor(num)))
    if (currency === 'dash') {
      setEquivalentAmount(dashValue.toFixed(8))
    } else if (r !== null) {
      setEquivalentAmount((dashValue * r).toFixed(2))
    }
  }, [])

  const handleAmountChange = useCallback((value: string): void => {
    const parsed = parseDecimalInput(value, 0)
    if (parsed === null) return

    if (parsed !== '' && parsed !== '.') {
      const num = Number(parsed)
      if (balance !== null) {
        const availableBalance = balance.toString()
        if (!isNaN(num) && num > Number(availableBalance)) {
          setFormData(prev => ({ ...prev, amount: availableBalance }))
          updateEquivalent(availableBalance, equivalentCurrency, rate)
          return
        }
      }
    }

    setFormData(prev => ({ ...prev, amount: parsed }))
    updateEquivalent(parsed, equivalentCurrency, rate)

    if (parsed !== '' && parsed !== '.') {
      const amountBigInt = BigInt(Math.floor(Number(parsed)))
      if (amountBigInt > 0n && amountBigInt < MIN_CREDIT_WITHDRAWAL) {
        setError(`Minimum withdrawal amount is ${MIN_CREDIT_WITHDRAWAL.toLocaleString()} credits`)
      } else if (amountBigInt > MAX_CREDIT_WITHDRAWAL) {
        setError(`Maximum withdrawal amount is ${MAX_CREDIT_WITHDRAWAL.toLocaleString()} credits`)
      } else {
        setError(null)
      }
    } else {
      setError(null)
    }
  }, [balance, equivalentCurrency, rate, updateEquivalent])

  const handleEquivalentChange = useCallback((value: string): void => {
    const decimals = equivalentCurrency === 'dash' ? 8 : 2
    const parsed = parseDecimalInput(value, decimals)
    if (parsed === null) return

    setEquivalentAmount(parsed)

    if (parsed !== '' && parsed !== '.') {
      const equivalentValue = Number(parsed)
      if (!isNaN(equivalentValue) && equivalentValue > 0) {
        let dashValue: number

        if (equivalentCurrency === 'dash') {
          dashValue = equivalentValue
        } else if (rate !== null && rate > 0) {
          dashValue = equivalentValue / rate
        } else {
          setFormData(prev => ({ ...prev, amount: '' }))
          return
        }

        const creditsAmount = Math.floor(dashValue * 1e11)
        setFormData(prev => ({ ...prev, amount: creditsAmount.toString() }))

        const amountBigInt = BigInt(creditsAmount)
        if (amountBigInt > 0n && amountBigInt < MIN_CREDIT_WITHDRAWAL) {
          setError(`Minimum withdrawal amount is ${MIN_CREDIT_WITHDRAWAL.toLocaleString()} credits`)
        } else if (amountBigInt > MAX_CREDIT_WITHDRAWAL) {
          setError(`Maximum withdrawal amount is ${MAX_CREDIT_WITHDRAWAL.toLocaleString()} credits`)
        } else {
          setError(null)
        }
      } else {
        setFormData(prev => ({ ...prev, amount: '' }))
        setError(null)
      }
    } else {
      setFormData(prev => ({ ...prev, amount: '' }))
      setError(null)
    }
  }, [equivalentCurrency, rate])

  const handleEquivalentCurrencyChange = useCallback((currency: 'usd' | 'dash'): void => {
    setEquivalentCurrency(currency)
    if (formData.amount !== '') {
      updateEquivalent(formData.amount, currency, rate)
    }
  }, [formData.amount, rate, updateEquivalent])

  const handleQuickAmount = useCallback((percentage: number): void => {
    if (balance === null || balance <= 0n) return

    const network = (currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'
    const fee = ESTIMATED_FEES[network].credits
    const availableBalance = balance - fee

    if (availableBalance <= 0n) {
      setError('Insufficient balance to cover fees')
      return
    }

    const calculated = multiplyBigIntByPercentage(availableBalance, percentage)
    const amount = calculated.toString()
    setFormData(prev => ({ ...prev, amount }))
    updateEquivalent(amount, equivalentCurrency, rate)
  }, [balance, currentNetwork, equivalentCurrency, rate, updateEquivalent])

  const handleAddressChange = useCallback((value: string): void => {
    setFormData(prev => ({ ...prev, recipientAddress: value }))
    setError(null)
  }, [])

  return {
    formData,
    equivalentAmount,
    equivalentCurrency,
    error,
    handleAmountChange,
    handleEquivalentChange,
    handleEquivalentCurrencyChange,
    handleQuickAmount,
    handleAddressChange,
    setError,
    setEquivalentAmount
  }
}
