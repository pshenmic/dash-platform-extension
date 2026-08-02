import { useState, useCallback } from 'react'
import type { TokenData } from '../../types'
import type { RecipientSearchResult, RecipientTargetType } from '../../utils'
import {
  parseDecimalInput,
  parseCreditsAmount,
  creditsToDash,
  multiplyBigIntByPercentage
} from '../../utils'
import { MIN_CREDIT_TRANSFER, ESTIMATED_FEES } from '../constants/transaction'
import { MIN_OUTPUT_CREDITS, TRANSFER_FEE_CREDITS, MIN_WITHDRAWAL_CREDITS, MAX_WITHDRAWAL_CREDITS } from '../../constants'
import { getAvailableBalance, getAssetDecimals } from '../../utils/transactionFormatters'

interface SendFormData {
  recipient: string
  amount: string
  selectedAsset: string
}

interface RecipientData {
  identifier: string
  name?: string
  type?: RecipientTargetType
}

// Recipients that are paid through a platform-address transfer (flat platform
// fee, dust minimum) rather than an identity credit transfer.
const ADDRESS_RECIPIENT_TYPES: RecipientTargetType[] = ['platformAddress', 'coreAddress', 'shieldAddress', 'shieldedPool']

interface CreditLimits {
  min: bigint
  minMessage: string
  max: bigint | null
  maxMessage: string | null
}

interface UseSendTransactionFormParams {
  balance: bigint | null
  rate: number | null
  currentNetwork: string | null
  tokens: TokenData[]
  // When true, treat the transfer as a platform-address transfer (flat platform
  // fee + dust minimum) regardless of the recipient — e.g. sending from an address.
  platformTransfer?: boolean
  // Flat fee reserved for a platform transfer. Shielded spends carry their own
  // estimate, so the caller can override the transparent-transfer default.
  platformFeeCredits?: bigint
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
  tokens,
  platformTransfer = false,
  platformFeeCredits = TRANSFER_FEE_CREDITS
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

  const getCreditLimits = useCallback((): CreditLimits => {
    // A Core (L1) recipient makes this a withdrawal, which Platform bounds on
    // both ends regardless of where the credits are spent from.
    if (selectedRecipient?.type === 'coreAddress') {
      return {
        min: MIN_WITHDRAWAL_CREDITS,
        minMessage: `Minimum withdrawal amount is ${MIN_WITHDRAWAL_CREDITS.toLocaleString()} credits`,
        max: MAX_WITHDRAWAL_CREDITS,
        maxMessage: `Maximum withdrawal amount is ${MAX_WITHDRAWAL_CREDITS.toLocaleString()} credits`
      }
    }
    if (platformTransfer || (selectedRecipient?.type != null && ADDRESS_RECIPIENT_TYPES.includes(selectedRecipient.type))) {
      return {
        min: MIN_OUTPUT_CREDITS,
        minMessage: `Minimum platform transfer amount is ${MIN_OUTPUT_CREDITS.toLocaleString()} credits`,
        max: null,
        maxMessage: null
      }
    }
    return {
      min: MIN_CREDIT_TRANSFER,
      minMessage: `Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`,
      max: null,
      maxMessage: null
    }
  }, [selectedRecipient, platformTransfer])

  // Error for an amount outside the limits of the current transfer, or null.
  const validateCredits = useCallback((amountCredits: bigint): string | null => {
    const { min, minMessage, max, maxMessage } = getCreditLimits()

    if (amountCredits < min) return minMessage
    if (max !== null && amountCredits > max) return maxMessage

    return null
  }, [getCreditLimits])

  // Recompute the equivalent (DASH / USD) display from a credits amount.
  const recomputeEquivalent = useCallback((credits: bigint, currency: 'usd' | 'dash' = equivalentCurrency): void => {
    const dashValue = creditsToDash(credits)

    if (currency === 'dash') {
      setEquivalentAmount(dashValue.toFixed(8))
    } else if (rate !== null) {
      setEquivalentAmount((dashValue * rate).toFixed(2))
    }
  }, [equivalentCurrency, rate])

  const handleRecipientChange = useCallback((value: string): void => {
    setFormData(prev => ({ ...prev, recipient: value }))
    setSelectedRecipient(null)
    setError(null)
  }, [])

  const handleRecipientSelect = useCallback((recipient: RecipientSearchResult): void => {
    setSelectedRecipient({
      identifier: recipient.identifier,
      name: recipient.name,
      type: recipient.type ?? 'identity'
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
          recomputeEquivalent(creditsAmount)
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
        recomputeEquivalent(creditsAmount)
      } else {
        setEquivalentAmount('')
      }
    } else if (parsed === '' || parsed === '.') {
      setEquivalentAmount('')
    }

    // Validate amount
    if (parsed !== '' && parsed !== '.') {
      const numericValue = Number(parsed)

      // Credit amount limits validation
      if (formData.selectedAsset === 'credits' && numericValue > 0) {
        setError(validateCredits(BigInt(Math.floor(numericValue))))
      }
    }
  }, [formData.selectedAsset, balance, rate, equivalentCurrency, getSelectedToken, validateCredits, recomputeEquivalent, tokens])

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

        const creditsAmount = Math.floor(dashValue * 1e11)
        setFormData(prev => ({ ...prev, amount: creditsAmount.toString() }))

        if (formData.selectedAsset === 'credits') {
          const amountBigInt = BigInt(creditsAmount)
          setError(amountBigInt > 0n ? validateCredits(amountBigInt) : null)
        }
      } else {
        setFormData(prev => ({ ...prev, amount: '' }))
        setError(null)
      }
    } else if (parsed === '' || parsed === '.') {
      setFormData(prev => ({ ...prev, amount: '' }))
      setError(null)
    }
  }, [equivalentCurrency, rate, formData.selectedAsset, validateCredits])

  const handleQuickAmount = useCallback((percentage: number): void => {
    if (formData.selectedAsset === 'credits') {
      // For credits - deduct fee from balance before calculating percentage
      if (balance !== null && balance > 0n) {
        // Calculate fee based on network and asset type. Platform-address transfers
        // use the flat platform transfer fee instead of the identity credit fee.
        const network = (currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'
        const isIdentityWithdrawal = !platformTransfer && selectedRecipient?.type === 'coreAddress'
        const isPlatformTransfer = platformTransfer ||
          (!isIdentityWithdrawal && selectedRecipient?.type != null &&
            ADDRESS_RECIPIENT_TYPES.includes(selectedRecipient.type))
        const fee = isPlatformTransfer ? platformFeeCredits : ESTIMATED_FEES[network].credits
        const { min, max } = getCreditLimits()
        const availableBalanceValue = balance - fee

        // Check if balance is enough to cover fee + minimum transfer
        if (availableBalanceValue < min) {
          setError('Insufficient balance to cover fee and minimum transfer amount')
          return
        }

        const calculatedAmount = multiplyBigIntByPercentage(availableBalanceValue, percentage)
        // Keep the result inside the limits of this transfer
        const boundedAmount = calculatedAmount < min
          ? min
          : (max !== null && calculatedAmount > max) ? max : calculatedAmount
        const amount = boundedAmount.toString()
        setFormData(prev => ({ ...prev, amount }))

        // Update equivalent amount
        const creditsAmount = BigInt(amount)
        recomputeEquivalent(creditsAmount)
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
  }, [formData.selectedAsset, balance, rate, equivalentCurrency, currentNetwork, getSelectedToken, getCreditLimits, recomputeEquivalent, selectedRecipient, platformTransfer, platformFeeCredits, tokens])

  const handleAssetSelect = useCallback((asset: string): void => {
    setFormData(prev => ({ ...prev, selectedAsset: asset, amount: '' }))
    setEquivalentAmount('')
    setError(null)
  }, [])

  const handleEquivalentCurrencyChange = useCallback((currency: 'usd' | 'dash'): void => {
    setEquivalentCurrency(currency)

    // Recalculate equivalent amount with new currency
    if (formData.selectedAsset === 'credits') {
      const creditsAmount = parseCreditsAmount(formData.amount)
      if (creditsAmount !== null) {
        recomputeEquivalent(creditsAmount, currency)
      }
    }
  }, [formData.amount, formData.selectedAsset, recomputeEquivalent])

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
