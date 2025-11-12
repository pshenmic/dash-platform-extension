import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Button,
  Text,
  ChevronIcon,
  Avatar,
  ValueCard,
  Identifier,
  DashLogo
} from 'dash-ui-kit/react'
import { base64 } from '@scure/base'
import { AutoSizingInput, AssetSelectionMenu } from '../../components/controls'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useExtensionAPI, useAsyncState, useSdk, usePlatformExplorerClient } from '../../hooks'
import { RecipientSearchInput } from '../../components/Identities'
import type { NetworkType, TokenData } from '../../../types'
import type { OutletContext } from '../../types'
import type { RecipientSearchResult } from '../../../utils'
import {
  creditsToDashBigInt,
  creditsToDash,
  fromBaseUnit,
  parseDecimalInput,
  toBaseUnit,
  multiplyBigIntByPercentage
} from '../../../utils'

interface SendFormData {
  recipient: string
  amount: string
  selectedAsset: string
}

interface RecipientData {
  identifier: string
  name?: string
}

const QUICK_AMOUNT_BUTTONS = [
  { label: 'Max', value: 1 },
  { label: '50%', value: 0.5 },
  { label: '25%', value: 0.25 }
]

// Minimum credit transfer amount enforced by the protocol (0.001 DASH)
const MIN_CREDIT_TRANSFER = 100000n

function SendTransactionState (): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const platformExplorerClient = usePlatformExplorerClient()
  const { currentNetwork, currentIdentity, setHeaderComponent, allWallets, currentWallet } = useOutletContext<OutletContext>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<bigint | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [tokensState, loadTokens] = useAsyncState<TokenData[]>()
  const [showAssetSelection, setShowAssetSelection] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientData | null>(null)
  const [formData, setFormData] = useState<SendFormData>({
    recipient: '',
    amount: '',
    selectedAsset: 'credits'
  })
  const [equivalentAmount, setEquivalentAmount] = useState<string>('')
  const [lastEditedField, setLastEditedField] = useState<'amount' | 'equivalent'>('amount')
  const [equivalentCurrency, setEquivalentCurrency] = useState<'usd' | 'dash'>('usd')
  const [showEquivalentCurrencyMenu, setShowEquivalentCurrencyMenu] = useState(false)
  const currencyMenuRef = useRef<HTMLDivElement>(null)

  // Close currency menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (currencyMenuRef.current != null && !currencyMenuRef.current.contains(event.target as Node)) {
        setShowEquivalentCurrencyMenu(false)
      }
    }

    if (showEquivalentCurrencyMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEquivalentCurrencyMenu])

  // Load balance, tokens and exchange rate on component mount
  useEffect(() => {
    const loadBalance = async (): Promise<void> => {
      if ((currentIdentity !== null && currentIdentity !== undefined)) {
        try {
          // Load credits balance (which is the identity balance)
          const identityBalance = await sdk.identities.getIdentityBalance(currentIdentity)
          setBalance(identityBalance)
        } catch (err) {
          console.error('Failed to load balance:', err)
        }
      }
    }

    const loadRate = async (): Promise<void> => {
      try {
        const rate = await platformExplorerClient.fetchRate((currentNetwork ?? 'testnet') as NetworkType)
        setRate(rate)
      } catch (err) {
        console.log('Failed to load exchange rate:', err)
        setRate(null)
      }
    }

    void loadBalance().catch(e => console.log('loadBalance error:', e))
    void loadRate().catch(e => console.log('loadRate error:', e))
  }, [currentIdentity, sdk, currentNetwork])

  // Load tokens for the current identity
  useEffect(() => {
    if (currentIdentity === null) return

    loadTokens(async () => {
      return await platformExplorerClient.fetchTokens(currentIdentity, currentNetwork as NetworkType, 100, 1)
    }).catch(e => console.log('loadTokens error:', e))
  }, [currentIdentity, currentNetwork, platformExplorerClient, loadTokens])

  // Get wallet name for display
  const getWalletName = (): string => {
    if (currentWallet == null || allWallets == null || allWallets.length === 0) return 'Wallet'

    const availableWallets = allWallets.filter(wallet => wallet.network === currentNetwork)
    const currentWalletData = availableWallets.find(wallet => wallet.walletId === currentWallet)

    if (currentWalletData == null) return 'Wallet'

    const currentWalletIndex = availableWallets.findIndex(wallet => wallet.walletId === currentWallet)
    return currentWalletData.label ?? `Wallet_${currentWalletIndex + 1}`
  }

  // Set header component with identity and wallet info
  useEffect(() => {
    if (currentIdentity !== null) {
      setHeaderComponent(
        <ValueCard colorScheme='lightGray' border={false} className='py-[0.5rem] px-[0.625rem]'>
          <div className='flex items-center gap-2'>
            <div className='flex items-center justify-center rounded-full w-[2rem] h-[2rem] bg-[rgba(12,28,51,0.03)]'>
              <Avatar username={currentIdentity} className='w-4 h-4' />
            </div>
            <div className='flex flex-col gap-1'>
              <Identifier className='text-xs leading-[100%]' highlight='both' middleEllipsis edgeChars={4}>
                {currentIdentity}
              </Identifier>
              <Text size='xs' dim className='leading-[90%]'>
                {getWalletName()}
              </Text>
            </div>
          </div>
        </ValueCard>
      )
    }

    // Clear header component on unmount
    return () => {
      setHeaderComponent(null)
    }
  }, [currentIdentity, currentWallet, allWallets, currentNetwork, setHeaderComponent])

  // Handle recipient selection
  const handleRecipientSelect = (recipient: RecipientSearchResult): void => {
    setSelectedRecipient({
      identifier: recipient.identifier,
      name: recipient.name
    })
    setFormData(prev => ({ ...prev, recipient: recipient.identifier }))
    setError(null)
  }

  const getAvailableBalance = (): string => {
    if (formData.selectedAsset === 'credits' && balance !== null) {
      return balance.toString()
    }

    const token = getSelectedToken()
    if (token != null) {
      return fromBaseUnit(token.balance, token.decimals)
    }

    return '0'
  }

  const getAssetDecimals = (): number => {
    if (formData.selectedAsset === 'credits') return 0

    const token = getSelectedToken()
    return token?.decimals ?? 0
  }

  const handleInputChange = (field: keyof SendFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)

    // Reset selected recipient when user manually changes recipient field
    if (field === 'recipient') {
      setSelectedRecipient(null)
    }

    // Validation for amount field
    if (field === 'amount' && value.trim() !== '') {
      const availableBalance = getAvailableBalance()
      const numericValue = Number(value)
      const numericBalance = Number(availableBalance)

      // Balance validation
      if (!isNaN(numericValue) && !isNaN(numericBalance) && numericValue > numericBalance) {
        setError('Amount exceeds available balance')
        return
      }

      // Minimum credit transfer validation
      if (formData.selectedAsset === 'credits') {
        const amountInCredits = BigInt(Math.floor(numericValue))
        if (amountInCredits > 0n && amountInCredits < MIN_CREDIT_TRANSFER) {
          setError(`Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`)
        }
      }
    }
  }

  // Handle amount input change and sync with equivalent
  const handleAmountChange = (value: string): void => {
    setLastEditedField('amount')
    
    const decimals = getAssetDecimals()
    const parsed = parseDecimalInput(value, decimals)
    
    if (parsed === null) {
      return
    }

    // Check against available balance
    if (parsed !== '' && parsed !== '.') {
      const availableBalance = getAvailableBalance()
      const numericValue = Number(parsed)
      const numericBalance = Number(availableBalance)

      if (!isNaN(numericValue) && !isNaN(numericBalance) && numericValue > numericBalance) {
        setFormData(prev => ({ ...prev, amount: availableBalance }))
        // Update equivalent for max balance
        if (formData.selectedAsset === 'credits') {
          const creditsAmount = BigInt(Math.floor(Number(availableBalance)))
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
  }

  // Handle equivalent input change and sync with amount
  const handleEquivalentChange = (value: string): void => {
    setLastEditedField('equivalent')
    
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
  }

  const handleQuickAmount = (percentage: number): void => {
    setLastEditedField('amount')
    
    if (formData.selectedAsset === 'credits') {
      // For credits (no decimals), use simple percentage
      if (balance !== null && balance > 0n) {
        const calculatedAmount = multiplyBigIntByPercentage(balance, percentage)
        // Ensure amount doesn't exceed balance but meets minimum requirement
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
        const amount = fromBaseUnit(calculatedAmountInBaseUnits, decimals)
        setFormData(prev => ({ ...prev, amount }))
      }
    }
  }

  const handleSend = async (): Promise<void> => {
    if ((currentIdentity === null || currentIdentity === undefined)) {
      setError('No identity selected')
      return
    }

    // Validate that recipient is selected from search results
    if (selectedRecipient === null) {
      setError('Please select a recipient from search results')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (formData.selectedAsset === 'credits') {
        const amountInCredits = BigInt(Math.floor(Number(formData.amount)))

        // Validate minimum credit transfer amount
        if (amountInCredits < MIN_CREDIT_TRANSFER) {
          setError(`Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`)
          return
        }

        const identityNonce = await sdk.identities.getIdentityNonce(currentIdentity)

        // Create unsigned identity credit transfer state transition
        const stateTransition = sdk.identities.createStateTransition('creditTransfer', {
          identityId: currentIdentity,
          amount: amountInCredits,
          recipientId: selectedRecipient.identifier,
          identityNonce: identityNonce + 1n
        })

        // Convert to base64
        const stateTransitionBytes = stateTransition.bytes()
        const stateTransitionBase64 = base64.encode(stateTransitionBytes)

        // Create the state transition
        const response = await extensionAPI.createStateTransition(stateTransitionBase64)

        void navigate(`/approve/${response.stateTransition.hash}`, {
          state: {
            disableIdentitySelect: true,
            showBackButton: true,
            returnToHome: true
          }
        })
      } else {
        // Token transfer
        const token = getSelectedToken()
        if (token == null) {
          setError('Selected token not found')
          return
        }

        // Convert amount to base units
        const amountInBaseUnits = toBaseUnit(formData.amount, token.decimals, true) as bigint

        // Check if the converted amount is 0
        if (amountInBaseUnits === 0n) {
          setError('Amount is too small')
          return
        }

        // Create token base transition first
        const baseTransition = await sdk.tokens.createBaseTransition(
          token.identifier,
          currentIdentity
        )

        const stateTransition = sdk.tokens.createStateTransition(
          baseTransition,
          currentIdentity,
          'transfer',
          {
            identityId: selectedRecipient.identifier,
            amount: amountInBaseUnits
          }
        )

        const stateTransitionBytes = stateTransition.bytes()
        const stateTransitionBase64 = base64.encode(stateTransitionBytes)
        const response = await extensionAPI.createStateTransition(stateTransitionBase64)
        void navigate(`/approve/${response.stateTransition.hash}`, {
          state: {
            disableIdentitySelect: true,
            showBackButton: true,
            returnToHome: true
          }
        })
      }
    } catch (err) {
      console.error('Transaction creation failed:', err)
      setError(err instanceof Error ? err.message : 'Transaction creation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const getBalanceUSDValue = (): string | null => {
    if ((rate === null || rate === undefined)) return null

    if (formData.selectedAsset === 'credits' && balance !== null) {
      const dashValue = creditsToDashBigInt(balance)
      const dashAmount = Number(dashValue)
      const usdValue = dashAmount * rate
      return `~ $${usdValue.toFixed(3)}`
    }

    return null
  }

  const handleAssetSelect = (asset: string): void => {
    setFormData(prev => ({ ...prev, selectedAsset: asset, amount: '' }))
    setEquivalentAmount('')
    setError(null)
  }

  const handleEquivalentCurrencyChange = (currency: 'usd' | 'dash'): void => {
    setEquivalentCurrency(currency)
    setShowEquivalentCurrencyMenu(false)
    
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
  }

  const getSelectedToken = (): TokenData | undefined => {
    if (formData.selectedAsset === 'credits') {
      return undefined
    }
    return tokensState.data?.find(token => token.identifier === formData.selectedAsset)
  }

  const getAssetLabel = (): string => {
    if (formData.selectedAsset === 'credits') return 'CRDT'

    const token = getSelectedToken()
    if (token != null) {
      const singularForm = (token.localizations?.en?.singularForm ?? null) !== null ? token.localizations.en.singularForm : token.identifier
      return singularForm.toUpperCase().slice(0, 4)
    }

    return 'N/A'
  }

  const getFormattedBalance = (): string => {
    if (formData.selectedAsset === 'credits' && balance !== null) {
      return balance.toString()
    }

    const token = getSelectedToken()
    if (token != null) {
      return fromBaseUnit(token.balance, token.decimals)
    }

    return '0'
  }

  return (
    <div className='screen-content'>
      {/* Title Section with Asset Selector */}
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col gap-2'>
          {/* Title and Asset Selector */}
          <div className='flex items-center gap-[1.125rem]'>
            <Text className='text-dash-primary-dark-blue !text-[2.5rem] !font-medium !leading-[1.25] tracking-[-0.03em]'>
              Transfer
            </Text>

            {/* Asset Selector Badge */}
            <div
              className='flex items-center gap-3 px-2 py-1 pl-1 rounded-xl bg-[rgba(76,126,255,0.15)] cursor-pointer'
              onClick={() => setShowAssetSelection(true)}
            >
              {/* Asset Icon */}
              {formData.selectedAsset === 'credits'
                ? (
                  <div className='w-8 h-8 rounded-lg flex items-center justify-center bg-white'>
                    <span className='text-dash-brand text-[0.875rem] font-medium'>C</span>
                  </div>
                  )
                : (
                  <div className='w-8 h-8 rounded-lg flex items-center justify-center bg-white'>
                    <Avatar
                      username={getSelectedToken()?.identifier ?? ''}
                      className='w-8 h-8'
                    />
                  </div>
                  )}

              {/* Asset Name */}
              <Text className='text-dash-brand !text-[1.5rem] !font-medium !leading-[1.2]'>
                {formData.selectedAsset === 'credits'
                  ? 'Credits'
                  : (getSelectedToken()?.localizations?.en?.singularForm ?? getSelectedToken()?.identifier ?? 'Token')}
              </Text>

              {/* Chevron */}
              <ChevronIcon className='text-dash-brand w-3 h-[0.375rem]' />
            </div>
          </div>

          {/* Balance Display */}
          {((formData.selectedAsset === 'credits' && balance !== null) || (formData.selectedAsset !== 'credits' && getSelectedToken() != null)) && (
            <div className='flex items-center gap-3'>
              <Text size='xs' weight='medium' className='text-dash-primary-dark-blue opacity-50'>
                Balance: {getFormattedBalance()} {getAssetLabel()}
              </Text>
              {getBalanceUSDValue() !== null && (
                <div className='px-[0.3125rem] py-0 rounded-[0.3125rem] bg-[rgba(12,28,51,0.05)] flex items-center justify-center'>
                  <Text size='2xs' weight='light' className='text-dash-primary-dark-blue !text-[0.625rem] !leading-[1.2]'>
                    {getBalanceUSDValue()}
                  </Text>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <Text size='xs' weight='medium' className='text-dash-primary-dark-blue opacity-50'>
          You are going to transfer {formData.selectedAsset === 'credits' ? 'credits' : 'tokens'} from your account with this transaction. Carefully check the transaction details before proceeding to the next step.
        </Text>
      </div>

      {/* Amount Input Section */}
      <div className='flex flex-col items-center gap-[1.125rem] py-3 w-full'>
        {/* Dual Input Row */}
        <div className='flex items-end justify-center gap-3 w-full max-w-full px-0'>
          {/* Main Amount Input */}
          <AutoSizingInput
            value={formData.amount}
            onChange={handleAmountChange}
            placeholder='0'
            useDefaultStyles={false}
            sizing='fill'
            containerClassName='flex-1 min-w-0'
            className='flex items-center gap-2 px-3 py-1 border-0 border-b border-solid border-[rgba(12,28,51,0.15)] rounded-xl'
            inputClassName='text-dash-primary-dark-blue font-["Space_Grotesk"] font-bold text-[2rem] leading-[1.2] placeholder:text-[rgba(12,28,51,0.2)]'
            onChangeFilter={(value) => {
              const decimals = getAssetDecimals()
              const parsed = parseDecimalInput(value, decimals)
              return parsed ?? formData.amount
            }}
            rightContent={
              <Button
                onClick={() => handleQuickAmount(1)}
                variant='solid'
                colorScheme='lightBlue'
                size='sm'
                className='px-2 py-1 !min-h-0 text-[0.75rem] leading-[1.2] bg-[rgba(76,126,255,0.05)] text-dash-brand hover:bg-[rgba(76,126,255,0.1)] flex-shrink-0'
              >
                Max
              </Button>
            }
          />

          {/* Equivalent Input */}
          {formData.selectedAsset === 'credits' && (
            <AutoSizingInput
              value={equivalentAmount}
              onChange={handleEquivalentChange}
              placeholder='0'
              useDefaultStyles={false}
              sizing='auto'
              containerClassName='flex-shrink-0 max-w-[40%]'
              className='flex items-center gap-2 px-2 pl-2 py-1 border-0 border-b border-solid border-[rgba(12,28,51,0.15)] rounded-xl h-8'
              inputClassName='text-dash-primary-dark-blue opacity-35 font-["Space_Grotesk"] font-medium text-[1rem] leading-[1.2] placeholder:text-[rgba(12,28,51,0.2)]'
              minWidth={48}
              onChangeFilter={(value) => {
                const decimals = equivalentCurrency === 'dash' ? 8 : 2
                const parsed = parseDecimalInput(value, decimals)
                return parsed ?? equivalentAmount
              }}
              rightContent={
                <div ref={currencyMenuRef} className='relative flex-shrink-0'>
                  <div
                    className='flex items-center gap-1 px-1 py-1 rounded-[1.5rem] bg-[rgba(12,28,51,0.05)] cursor-pointer'
                    onClick={() => setShowEquivalentCurrencyMenu(!showEquivalentCurrencyMenu)}
                  >
                    <div className='w-4 h-4 rounded-full bg-dash-brand flex items-center justify-center'>
                      {equivalentCurrency === 'usd'
                        ? <span className='text-white text-[0.625rem] font-medium'>$</span>
                        : <DashLogo className='w-2 h-2' color='white' />}
                    </div>
                    <ChevronIcon className='text-dash-primary-dark-blue w-2 h-1' />
                  </div>

                  {/* Currency Menu */}
                  {showEquivalentCurrencyMenu && (
                    <div className='absolute top-full right-0 mt-1 flex flex-col gap-2 p-1 bg-[#F3F3F4] rounded-xl z-10'>
                      <div
                        className='w-4 h-4 rounded-full bg-dash-brand flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity'
                        onClick={() => handleEquivalentCurrencyChange('dash')}
                      >
                        <DashLogo className='w-2 h-2' color='white' />
                      </div>
                      <div
                        className='w-4 h-4 rounded-full bg-dash-brand flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity'
                        onClick={() => handleEquivalentCurrencyChange('usd')}
                      >
                        <span className='text-white text-[0.625rem] font-medium'>$</span>
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          )}
        </div>

        {/* Quick Amount Buttons */}
        <div className='flex gap-2'>
          {QUICK_AMOUNT_BUTTONS.map((button) => (
            <Button
              key={button.label}
              onClick={() => handleQuickAmount(button.value)}
              variant='solid'
              colorScheme='lightBlue'
              size='sm'
              className='px-2 py-1 !min-h-0 text-[0.75rem] leading-1'
            >
              {button.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Recipient Input */}
      <div className='flex flex-col gap-2.5'>
        <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>
          Recipient
        </Text>
        <RecipientSearchInput
          value={formData.recipient}
          onChange={(value) => handleInputChange('recipient', value)}
          onSelect={handleRecipientSelect}
          currentIdentity={currentIdentity}
          placeholder='Enter recipient identity identifier or name'
        />
      </div>

      {/* Error Message */}
      {(error !== null && error !== undefined) && (
        <ValueCard colorScheme='yellow'>
          {error}
        </ValueCard>
      )}

      {/* Action Button */}
      <div className='flex flex-col gap-4'>
        <Button
          colorScheme='brand'
          size='xl'
          className='w-full'
          onClick={() => {
            handleSend().catch(e => console.log('handleSend error', e))
          }}
          disabled={isLoading || selectedRecipient === null || formData.amount === ''}
        >
          {isLoading ? 'Creating Transaction...' : 'Next'}
        </Button>
      </div>

      {/* Asset Selection Menu */}
      <AssetSelectionMenu
        isOpen={showAssetSelection}
        onClose={() => setShowAssetSelection(false)}
        selectedAsset={formData.selectedAsset}
        onAssetSelect={handleAssetSelect}
        creditsBalance={(balance !== null && balance !== undefined) ? balance.toString() : undefined}
        tokens={tokensState.data ?? []}
      />
    </div>
  )
}

export default withAccessControl(SendTransactionState, { requireWallet: true })
