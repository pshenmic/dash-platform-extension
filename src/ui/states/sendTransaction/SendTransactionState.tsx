import React, { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Button,
  Text,
  ChevronIcon,
  DashLogo,
  Badge,
  Avatar
} from 'dash-ui-kit/react'
import { AutoSizingInput } from '../../components/controls'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useExtensionAPI, useAsyncState, useSdk, usePlatformExplorerClient } from '../../hooks'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { AssetSelectionMenu } from '../../components/assetSelection'
import { RecipientSearchInput } from '../../components/Identities'
import type { OutletContext } from '../../types'
import type { NetworkType, TokenData } from '../../../types'
import type { RecipientSearchResult } from '../../../utils'
import {
  creditsToDashBigInt,
  fromBaseUnit,
  parseDecimalInput,
  toBaseUnit
} from '../../../utils'

interface SendFormData {
  recipient: string
  amount: string
  selectedAsset: string
}

const QUICK_AMOUNT_BUTTONS = [
  { label: 'Max', value: 1 },
  { label: '50%', value: 0.5 },
  { label: '25%', value: 0.25 }
]

function SendTransactionState (): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const platformExplorerClient = usePlatformExplorerClient()
  const { currentNetwork, currentIdentity } = useOutletContext<OutletContext>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<bigint | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [tokensState, loadTokens] = useAsyncState<TokenData[]>()
  const [showAssetSelection, setShowAssetSelection] = useState(false)
  const [formData, setFormData] = useState<SendFormData>({
    recipient: '',
    amount: '',
    selectedAsset: 'dash'
  })

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

  // Handle recipient selection
  const handleRecipientSelect = (recipient: RecipientSearchResult): void => {
    setFormData(prev => ({ ...prev, recipient: recipient.identifier }))
    setError(null)
  }

  const getAvailableBalance = (): string => {
    if (formData.selectedAsset === 'dash' && balance !== null) {
      return creditsToDashBigInt(balance)
    }
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
    if (formData.selectedAsset === 'dash') return 8
    if (formData.selectedAsset === 'credits') return 0

    const token = getSelectedToken()
    return token?.decimals ?? 0
  }

  const handleInputChange = (field: keyof SendFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)

    // Real-time balance validation for amount field
    if (field === 'amount' && value.trim() !== '') {
      const availableBalance = getAvailableBalance()

      // Simple numeric comparison since balances are in decimal format
      const numericValue = Number(value)
      const numericBalance = Number(availableBalance)

      if (!isNaN(numericValue) && !isNaN(numericBalance) && numericValue > numericBalance) {
        setError('Amount exceeds available balance')
      }
    }
  }

  const handleQuickAmount = (percentage: number): void => {
    const availableBalance = getAvailableBalance()
    if (Number(availableBalance) > 0) {
      const decimals = getAssetDecimals()

      if (formData.selectedAsset === 'credits') {
        // For credits (no decimals), use simple percentage
        const amount = Math.floor(Number(availableBalance) * percentage).toString()
        setFormData(prev => ({ ...prev, amount }))
      } else {
        // For dash and tokens with decimals
        const amount = (Number(availableBalance) * percentage).toFixed(decimals)
        setFormData(prev => ({ ...prev, amount }))
      }
    }
  }

  const handleSend = async (): Promise<void> => {
    if ((currentIdentity === null || currentIdentity === undefined)) {
      setError('No identity selected')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (formData.selectedAsset === 'dash') {
        // TODO: Implement DASH transfer
        console.log('DASH transfer not yet implemented')
        setError('DASH transfers are not yet supported')
      } else if (formData.selectedAsset === 'credits') {
        // TODO: Implement credits transfer
        console.log('Credits transfer not yet implemented')
        setError('Credits transfers are not yet supported')
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

        console.log('Creating token transfer:', {
          tokenIdentifier: token.identifier,
          recipient: formData.recipient,
          amount: formData.amount,
          amountInBaseUnits: amountInBaseUnits.toString(),
          decimals: token.decimals
        })

        // Create token base transition first
        const baseTransition = await sdk.tokens.createBaseTransition(
          token.identifier,
          currentIdentity
        )

        console.log('baseTransition', baseTransition)

        // Create unsigned token transfer state transition
        const stateTransition = sdk.tokens.createStateTransition(
          baseTransition,
          currentIdentity,
          'transfer',
          {
            identityId: formData.recipient,
            amount: amountInBaseUnits
          }
        )

        // Store the unsigned state transition using the extension API
        const { base64 } = await import('@scure/base')
        const stateTransitionBytes = stateTransition.bytes()
        const stateTransitionBase64 = base64.encode(stateTransitionBytes)

        console.log('stateTransitionBase64', stateTransitionBase64)

        // Use the extension API to create the state transition
        // This ensures it's stored in the StateTransitionsRepository correctly
        const response = await extensionAPI.createStateTransition(stateTransitionBase64)

        console.log('response', response)

        console.log('State transition created:', response.hash)

        void navigate(`/approve/${response.hash}`, { state: { disableIdentitySelect: true } })
      }
    } catch (err) {
      console.error('Transaction creation failed:', err)
      setError(err instanceof Error ? err.message : 'Transaction creation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const formatUSDValue = (amount: string): string => {
    if ((rate === null || rate === undefined) || amount === '') return ''

    let dashAmount: number
    if (formData.selectedAsset === 'dash') {
      dashAmount = Number(amount)
    } else if (formData.selectedAsset === 'credits') {
      // Convert credits to DASH for USD calculation
      const creditsAmount = BigInt(Math.floor(Number(amount)))
      const dashValue = creditsToDashBigInt(creditsAmount)
      dashAmount = Number(dashValue)
    } else {
      return ''
    }

    const usdValue = dashAmount * rate
    return `~$${usdValue.toFixed(2)}`
  }

  const handleAssetSelect = (asset: string): void => {
    setFormData(prev => ({ ...prev, selectedAsset: asset, amount: '' }))
  }

  const getSelectedToken = (): TokenData | undefined => {
    if (formData.selectedAsset === 'dash' || formData.selectedAsset === 'credits') {
      return undefined
    }
    return tokensState.data?.find(token => token.identifier === formData.selectedAsset)
  }

  const getAssetLabel = (): string => {
    if (formData.selectedAsset === 'dash') return 'DASH'
    if (formData.selectedAsset === 'credits') return 'CRDT'

    const token = getSelectedToken()
    if (token != null) {
      const singularForm = (token.localizations?.en?.singularForm ?? null) !== null ? token.localizations.en.singularForm : token.identifier
      return singularForm.toUpperCase().slice(0, 4)
    }

    return 'N/A'
  }

  const getAssetIcon = (): React.ReactNode => {
    if (formData.selectedAsset === 'dash') {
      return <DashLogo className='!text-white w-2 h-2' />
    }
    if (formData.selectedAsset === 'credits') {
      return (
        <span className='text-dash-brand text-[0.6rem] font-medium'>C</span>
      )
    }

    const token = getSelectedToken()
    if (token != null) {
      return (
        <Avatar
          username={token.identifier}
          className='w-4 h-4'
        />
      )
    }

    return null
  }

  return (
    <div className='screen-content'>
      <TitleBlock
        title='Send Transaction'
        description='Carefully check the transaction details before continuing'
      />

      {/* Amount Input and Asset Selection */}
      <div className='flex justify-center'>
        <div className='flex flex-col justify-center items-center gap-[1.125rem] max-w-full'>
          {/* Amount Input */}
          <AutoSizingInput
            containerClassName='flex justify-center max-w-full'
            className='items-center max-w-full'
            value={formData.amount}
            onChange={(value) => handleInputChange('amount', value)}
            placeholder='0'
            onChangeFilter={(value) => {
              const decimals = getAssetDecimals()

              // Parse and validate decimal input
              const parsed = parseDecimalInput(value, decimals)
              if (parsed === null) {
                return formData.amount
              }

              // Check against available balance
              if ((parsed !== null && parsed !== undefined) && parsed !== '' && parsed !== '.') {
                const availableBalance = getAvailableBalance()
                const numericValue = Number(parsed)
                const numericBalance = Number(availableBalance)

                if (!isNaN(numericValue) && !isNaN(numericBalance) && numericValue > numericBalance) {
                  // Set to max balance if exceeds
                  return availableBalance
                }
              }

              return parsed
            }}
            rightContent={
              formData.amount !== '' && (
                <Text size='sm' className='text-dash-primary-dark-blue opacity-35 ml-2' dim>
                  {formatUSDValue(formData.amount)}
                </Text>
              )
            }
          />

          {/* Asset Selection and Quick Buttons */}
          <div className='flex gap-3'>
            {/* Asset Selection */}
            <Badge
              color='light-gray'
              variant='flat'
              size='xxs'
              className='flex items-center gap-2 w-max cursor-pointer'
              onClick={() => setShowAssetSelection(true)}
            >
              {formData.selectedAsset === 'dash' || formData.selectedAsset === 'credits'
                ? (
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    formData.selectedAsset === 'dash'
                      ? 'bg-dash-brand'
                      : 'bg-[rgba(12,28,51,0.05)]'
                  }`}
                  >
                    {getAssetIcon()}
                  </div>
                  )
                : (
                    getAssetIcon()
                  )}
              <Text weight='bold' className='text-dash-primary-dark-blue !text-[0.75rem]'>
                {getAssetLabel()}
              </Text>
              <ChevronIcon size={8} className='text-dash-primary-dark-blue mr-1' />
            </Badge>

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
        <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
          <Text size='sm' color='red'>
            {error}
          </Text>
        </div>
      )}

      {/* Action Button */}
      <div className='flex flex-col gap-4'>
        <Button
          colorScheme='brand'
          size='xl'
          className='w-full'
          onClick={handleSend}
          disabled={isLoading}
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
