import { useState, useCallback } from 'react'
import type { TokenData } from '../../types'
import type { RecipientSearchResult } from '../../utils'
import {
  parseDecimalInput,
  creditsToDash,
  multiplyBigIntByPercentage
} from '../../utils'
import { MIN_CREDIT_TRANSFER, ESTIMATED_FEES } from '../constants/transaction'
import { getAvailableBalance, getAssetDecimals } from '../../utils/transactionFormatters'

interface SendFormData {
  recipient: string
  amount: string
  selectedAsset: string
}

interface RecipientData {
  identifier: string
  name?: string
}

interface UseSendTransactionFormParams {
  balance: bigint | null
  rate: number | null
  currentNetwork: string | null
  tokens: TokenData[]
}

interface UseSendTransactionFormReturn {
  formData: SendFormData
  selectedRecipient: RecipientData | null
  error: string | null
  equivalentAmount: string
  equivalentCurrency: 'usd' | 'dash'
  handleRecipientChange: (value: string) => void
  handleRecipientSelect: (recipient: RecipientSearchResult) => void
  handleAmountChange: (value: string) => void
  handleEquivalentChange: (value: string) => void
  handleQuickAmount: (percentage: number) => void
  handleAssetSelect: (asset: string) => void
  handleEquivalentCurrencyChange: (currency: 'usd' | 'dash') => void
  setError: (error: string | null) => void
  setEquivalentAmount: (amount: string) => void
}

export function useSendTransactionForm ({
  balance,
  rate,
  currentNetwork,
  tokens
}: UseSendTransactionFormParams): UseSendTransactionFormReturn {
  const [formData, setFormData] = useState<SendFormData>({
    recipient: '',
    amount: '',
    selectedAsset: 'credits'
  })
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [equivalentAmount, setEquivalentAmount] = useState<string>('')
  const [equivalentCurrency, setEquivalentCurrency] = useState<'usd' | 'dash'>('usd')

  // Helper to get selected token
  const getSelectedToken = useCallback((): TokenData | undefined => {
    if (formData.selectedAsset === 'credits') {
      return undefined
    }
    return tokens.find(token => token.identifier === formData.selectedAsset)
  }, [formData.selectedAsset, tokens])

  const handleRecipientChange = useCallback((value: string): void => {
    setFormData(prev => ({ ...prev, recipient: value }))
    setSelectedRecipient(null)
    setError(null)
  }, [])

  const handleRecipientSelect = useCallback((recipient: RecipientSearchResult): void => {
    setSelectedRecipient({
      identifier: recipient.identifier,
      name: recipient.name
    })
    setFormData(prev => ({ ...prev, recipient: recipient.identifier }))
    setError(null)
  }, [])

  const handleAmountChange = useCallback((value: string): void => {
    const token = getSelectedToken()
    const decimals = getAssetDecimals(formData.selectedAsset, token)
    const parsed = parseDecimalInput(value, decimals)

    if (parsed === null) {
      return
    }

    // Check against available balance
    if (parsed !== '' && parsed !== '.') {
      const availableBalanceStr = getAvailableBalance(formData.selectedAsset, balance, token)
      const numericValue = Number(parsed)
      const numericBalance = Number(availableBalanceStr)

      if (!isNaN(numericValue) && !isNaN(numericBalance) && numericValue > numericBalance) {
        setFormData(prev => ({ ...prev, amount: availableBalanceStr }))
        // Update equivalent for max balance
        if (formData.selectedAsset === 'credits') {
          const creditsAmount = BigInt(Math.floor(Number(availableBalanceStr)))
          const dashValue = creditsToDash(creditsAmount)

          if (equivalentCurrency === 'dash') {
            setEquivalentAmount(dashValue.toFixed(8))
          } else if (rate !== null) {
            const usdValue = dashValue * rate
            setEquivalentAmount(usdValue.toFixed(2))
          }
        }
        return
      }
    }

    setFormData(prev => ({ ...prev, amount: parsed }))

    // Update equivalent amount for credits
    if (formData.selectedAsset === 'credits' && parsed !== '' && parsed !== '.') {
      const numericValue = Number(parsed)
      if (!isNaN(numericValue) && numericValue > 0) {
        const creditsAmount = BigInt(Math.floor(numericValue))
        const dashValue = creditsToDash(creditsAmount)

        if (equivalentCurrency === 'dash') {
          setEquivalentAmount(dashValue.toFixed(8))
        } else if (rate !== null) {
          const usdValue = dashValue * rate
          setEquivalentAmount(usdValue.toFixed(2))
        }
      } else {
        setEquivalentAmount('')
      }
    } else if (parsed === '' || parsed === '.') {
      setEquivalentAmount('')
    }

    // Validate amount
    if (parsed !== '' && parsed !== '.') {
      const numericValue = Number(parsed)

      // Minimum credit transfer validation
      if (formData.selectedAsset === 'credits' && numericValue > 0) {
        const amountInCredits = BigInt(Math.floor(numericValue))
        if (amountInCredits < MIN_CREDIT_TRANSFER) {
          setError(`Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`)
        } else {
          setError(null)
        }
      }
    }
  }, [formData.selectedAsset, balance, rate, equivalentCurrency, getSelectedToken, tokens])

  const handleEquivalentChange = useCallback((value: string): void => {
    const decimals = equivalentCurrency === 'dash' ? 8 : 2
    const parsed = parseDecimalInput(value, decimals)

    if (parsed === null) {
      return
    }

    setEquivalentAmount(parsed)

    // Update amount from equivalent
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

        const creditsAmount = Math.floor(dashValue * 10e10)
        setFormData(prev => ({ ...prev, amount: creditsAmount.toString() }))
      } else {
        setFormData(prev => ({ ...prev, amount: '' }))
      }
    } else if (parsed === '' || parsed === '.') {
      setFormData(prev => ({ ...prev, amount: '' }))
    }
  }, [equivalentCurrency, rate])

  const handleQuickAmount = useCallback((percentage: number): void => {
    if (formData.selectedAsset === 'credits') {
      // For credits - deduct fee from balance before calculating percentage
      if (balance !== null && balance > 0n) {
        // Calculate fee based on network and asset type
        const network = (currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'
        const fee = ESTIMATED_FEES[network].credits
        const availableBalanceValue = balance - fee

        // Check if balance is enough to cover fee + minimum transfer
        if (availableBalanceValue < MIN_CREDIT_TRANSFER) {
          setError('Insufficient balance to cover fee and minimum transfer amount')
          return
        }

        const calculatedAmount = multiplyBigIntByPercentage(availableBalanceValue, percentage)
        // Ensure amount meets minimum requirement
        const amount = calculatedAmount < MIN_CREDIT_TRANSFER
          ? MIN_CREDIT_TRANSFER.toString()
          : calculatedAmount.toString()
        setFormData(prev => ({ ...prev, amount }))

        // Update equivalent amount
        const creditsAmount = BigInt(amount)
        const dashValue = creditsToDash(creditsAmount)

        if (equivalentCurrency === 'dash') {
          setEquivalentAmount(dashValue.toFixed(8))
        } else if (rate !== null) {
          const usdValue = dashValue * rate
          setEquivalentAmount(usdValue.toFixed(2))
        }
      }
    } else {
      // For tokens with decimals - use bigint to avoid precision loss
      const token = getSelectedToken()
      if (token != null && BigInt(token.balance) > 0n) {
        const decimals = token.decimals
        const calculatedAmountInBaseUnits = multiplyBigIntByPercentage(BigInt(token.balance), percentage)
        const amount = String(calculatedAmountInBaseUnits / BigInt(10 ** decimals))
        setFormData(prev => ({ ...prev, amount }))
      }
    }
  }, [formData.selectedAsset, balance, rate, equivalentCurrency, currentNetwork, getSelectedToken, tokens])

  const handleAssetSelect = useCallback((asset: string): void => {
    setFormData(prev => ({ ...prev, selectedAsset: asset, amount: '' }))
    setEquivalentAmount('')
    setError(null)
  }, [])

  const handleEquivalentCurrencyChange = useCallback((currency: 'usd' | 'dash'): void => {
    setEquivalentCurrency(currency)

    // Recalculate equivalent amount with new currency
    if (formData.amount !== '' && formData.selectedAsset === 'credits') {
      const creditsAmount = BigInt(Math.floor(Number(formData.amount)))
      const dashValue = creditsToDash(creditsAmount)

      if (currency === 'dash') {
        setEquivalentAmount(dashValue.toFixed(8))
      } else if (rate !== null) {
        const usdValue = dashValue * rate
        setEquivalentAmount(usdValue.toFixed(2))
      }
    }
  }, [formData.amount, formData.selectedAsset, rate])

  return {
    formData,
    selectedRecipient,
    error,
    equivalentAmount,
    equivalentCurrency,
    handleRecipientChange,
    handleRecipientSelect,
    handleAmountChange,
    handleEquivalentChange,
    handleQuickAmount,
    handleAssetSelect,
    handleEquivalentCurrencyChange,
    setError,
    setEquivalentAmount
  }
}
