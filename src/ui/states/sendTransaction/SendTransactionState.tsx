import React, { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Button,
  Text,
  Input,
  ChevronIcon,
  DashLogo,
  Badge,
  ErrorIcon,
  CircleProcessIcon,
  Avatar
} from 'dash-ui-kit/react'
import { AutoSizingInput } from '../../components/controls'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useExtensionAPI, useAsyncState, useSdk } from '../../hooks'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { PublicKeySelect, PublicKeyInfo, KeyRequirement } from '../../components/keys'
import { AssetSelectionMenu } from '../../components/assetSelection'
import type { OutletContext } from '../../types'
import { PlatformExplorerClient } from '../../../types'
import type { NetworkType } from '../../../types'
import { loadSigningKeys, validateRecipientIdentifier, type IdentityValidationState } from '../../../utils'

interface AssetOption {
  value: 'dash' | 'credits' | 'tokens'
  label: string
  icon?: React.ReactNode
}

interface SendFormData {
  recipient: string
  amount: string
  selectedAsset: 'dash' | 'credits' | 'tokens'
  selectedKeyId: string | null
  password: string
}

const ASSET_OPTIONS: AssetOption[] = [
  { value: 'dash', label: 'DASH' },
  { value: 'credits', label: 'Credits' },
  { value: 'tokens', label: 'Tokens' }
]

const QUICK_AMOUNT_BUTTONS = [
  { label: 'Max', value: 1 },
  { label: '50%', value: 0.5 },
  { label: '25%', value: 0.25 }
]

function SendTransactionState(): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const platformExplorerClient = new PlatformExplorerClient()
  const { currentNetwork, currentWallet, currentIdentity } = useOutletContext<OutletContext>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<bigint | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [publicKeys, setPublicKeys] = useState<PublicKeyInfo[]>([])
  const [signingKeysState, loadSigningKeysAsync] = useAsyncState<PublicKeyInfo[]>()
  const [showAssetSelection, setShowAssetSelection] = useState(false)
  const [recipientValidationState, setRecipientValidationState] = useState<IdentityValidationState>({
    isValidating: false,
    isValid: null,
    error: null
  })
  const [formData, setFormData] = useState<SendFormData>({
    recipient: '',
    amount: '',
    selectedAsset: 'dash',
    selectedKeyId: null,
    password: ''
  })

  // Define key requirements for credit transfer transactions
  const keyRequirements: KeyRequirement[] = [
    { purpose: 'AUTHENTICATION', securityLevel: 'HIGH' },
    { purpose: 'AUTHENTICATION', securityLevel: 'MASTER' },
    { purpose: 'MASTER', securityLevel: 'MASTER' }
  ]

  // Load balance and exchange rate on component mount
  useEffect(() => {
    const loadBalance = async () => {
      if (currentIdentity) {
        try {
          // Load credits balance (which is the identity balance)
          const identityBalance = await sdk.identities.getIdentityBalance(currentIdentity)
          setBalance(identityBalance)
        } catch (err) {
          console.error('Failed to load balance:', err)
        }
      }
    }

    const loadRate = async () => {
      try {
        const rate = await platformExplorerClient.fetchRate((currentNetwork ?? 'testnet') as NetworkType)
        setRate(rate)
      } catch (err) {
        console.log('Failed to load exchange rate:', err)
        setRate(null)
      }
    }

    loadBalance().catch(e => console.log('loadBalance error:', e))
    loadRate().catch(e => console.log('loadRate error:', e))
  }, [currentIdentity, sdk, currentNetwork])

  // Load signing keys when wallet/identity/network changes
  useEffect(() => {
    if (currentWallet == null || currentNetwork == null || currentIdentity == null) {
      setPublicKeys([])
      setFormData(prev => ({ ...prev, selectedKeyId: null }))
      return
    }

    loadSigningKeysAsync(async () => {
      const allWallets = await extensionAPI.getAllWallets()
      const wallet = allWallets.find(w => w.walletId === currentWallet && w.network === currentNetwork)
      if (wallet == null) throw new Error('Wallet not found')

      return await loadSigningKeys(sdk, extensionAPI, currentIdentity)
    })
      .catch(e => console.log('loadSigningKeys error', e))
  }, [currentWallet, currentNetwork, currentIdentity, sdk, extensionAPI])

  // Update local state when signing keys are loaded
  useEffect(() => {
    if (signingKeysState.data != null) {
      setPublicKeys(signingKeysState.data)
      return
    }

    setPublicKeys([])

    if (formData.selectedKeyId !== null) {
      setFormData(prev => ({ ...prev, selectedKeyId: null }))
    }
  }, [signingKeysState.data, formData.selectedKeyId])

  // Handle recipient identifier validation
  const handleRecipientValidation = async (identifier: string): Promise<void> => {
    if (!identifier.trim()) {
      setRecipientValidationState({
        isValidating: false,
        isValid: null,
        error: null
      })
      return
    }

    setRecipientValidationState({
      isValidating: true,
      isValid: null,
      error: null
    })

    const validationResult = await validateRecipientIdentifier(
      identifier,
      platformExplorerClient,
      sdk,
      currentNetwork as NetworkType | null
    )

    setRecipientValidationState(validationResult)
  }

  // Debounced validation for recipient input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.recipient.trim()) {
        handleRecipientValidation(formData.recipient).catch(console.error)
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [formData.recipient, currentNetwork])

  const handleInputChange = (field: keyof SendFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    
    // Reset recipient validation when typing
    if (field === 'recipient') {
      setRecipientValidationState({
        isValidating: false,
        isValid: null,
        error: null
      })
    }
    
    // Real-time balance validation for amount field
    if (field === 'amount' && balance !== null && value.trim() !== '') {
      const numericValue = Number(value)
      if (numericValue > Number(balance)) {
        setError('Amount exceeds available balance')
      }
    }
  }

  const handleQuickAmount = (percentage: number) => {
    if (balance !== null) {
      const amount = (Number(balance) * percentage).toString()
      setFormData(prev => ({ ...prev, amount }))
    }
  }

  const validateForm = (): string | null => {
    if (!formData.recipient.trim()) {
      return 'Recipient identifier is required'
    }
    if (recipientValidationState.isValidating) {
      return 'Validating recipient identifier...'
    }
    if (recipientValidationState.isValid === false) {
      return recipientValidationState.error || 'Invalid recipient identifier'
    }
    if (recipientValidationState.isValid === null && formData.recipient.trim()) {
      return 'Please wait for recipient validation to complete'
    }
    if (!formData.amount.trim() || Number(formData.amount) <= 0) {
      return 'Valid amount is required'
    }
    if (balance !== null && Number(formData.amount) > Number(balance)) {
      return 'Insufficient balance'
    }
    return null
  }

  const handleNext = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    // setShowPasswordField(true)
  }

  const handleSend = async () => {
    if (!formData.password.trim()) {
      setError('Password is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // TODO: Implement actual send transaction logic
      console.log('Sending transaction:', formData)
      
      // Navigate to transaction confirmation or home
      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
    } finally {
      setIsLoading(false)
    }
  }

  const formatUSDValue = (amount: string): string => {
    // Only show USD value for DASH
    if (!rate || !amount || formData.selectedAsset !== 'dash') return ''
    const usdValue = Number(amount) * rate
    return `~$${usdValue.toFixed(2)}`
  }

  const handleAssetSelect = (asset: 'dash' | 'credits') => {
    setFormData(prev => ({ ...prev, selectedAsset: asset }))
  }

  const getAssetLabel = (): string => {
    return formData.selectedAsset === 'dash' ? 'DASH' : 'CRDT'
  }

  const getAssetIcon = (): React.ReactNode => {
    if (formData.selectedAsset === 'dash') {
      return <DashLogo className='!text-white w-2 h-2' />
    }
    return (
      <span className='text-dash-brand text-[0.6rem] font-medium'>C</span>
    )
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
            onChangeFilter={(value) => value.replace(/[^0-9.]/g, '')}
            rightContent={
              formData.amount && (
                <Text size='sm' className='text-dash-primary-dark-blue opacity-35 ml-2' dim>
                  {formatUSDValue(formData.amount)}
                </Text>
              )
            }
          />

          {/* Asset Selection and Quick Buttons */}
          <div className='flex flex-col gap-1'>
            {/* Asset Selection */}
            <div
              onClick={() => setShowAssetSelection(true)}
              className='cursor-pointer'
            >
              <Badge
                color='light-gray'
                variant='flat'
                size='xxs'
                className='flex items-center gap-2 w-max'
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  formData.selectedAsset === 'dash' 
                    ? 'bg-dash-brand' 
                    : 'bg-[rgba(12,28,51,0.05)]'
                }`}>
                  {getAssetIcon()}
                </div>
                <Text weight='bold' className='text-dash-primary-dark-blue !text-[0.75rem]'>
                  {getAssetLabel()}
                </Text>
                <ChevronIcon direction='down' size={8} className='text-dash-primary-dark-blue mr-1' />
              </Badge>
            </div>

            {/* Quick Amount Buttons */}
            <div className='flex gap-2'>
              {QUICK_AMOUNT_BUTTONS.map((button) => (
                <Button
                  key={button.label}
                  onClick={() => handleQuickAmount(button.value)}
                  variant='solid'
                  colorScheme='lightBlue'
                  size='xs'
                  className='px-2 py-1 !min-h-0 text-[0.75rem]'
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
          Recipient Identity
        </Text>
        <div className='relative'>
          <Input
            value={formData.recipient}
            onChange={(e) => handleInputChange('recipient', e.target.value)}
            placeholder='Enter recipient identity identifier'
            size='xl'
            variant='outlined'
            className={`pr-10 ${
              recipientValidationState.isValid === true 
                ? 'border-green-500' 
                : recipientValidationState.isValid === false 
                  ? 'border-red-500' 
                  : ''
            }`}
            prefixClassName='flex items-center !opacity-100'
            prefix={
              <div className={`${formData.recipient.trim() && (recipientValidationState.isValidating || recipientValidationState.isValid === true) ? 'w-6' : 'w-0'} h-6 flex items-center justify-center`}>
                {recipientValidationState.isValidating ? (
                  <CircleProcessIcon className='w-4 h-4 text-blue-500 animate-spin' />
                ) : recipientValidationState.isValid === true ? (
                  <Avatar
                    username={formData.recipient}
                    size='xs'
                    className='w-6 h-6'
                  />
                ) : null}
              </div>
            }
          />
          {/* Validation Icon */}
          {formData.recipient.trim() && (
            <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
              {/* {recipientValidationState.isValidating && (
                <CircleProcessIcon className='w-4 h-4 text-blue-500 animate-spin' />
              )} */}
              {recipientValidationState.isValid === false && (
                <ErrorIcon className='w-4 h-4 text-red-500' />
              )}
            </div>
          )}
        </div>
        {recipientValidationState.error && (
          <Text size='sm' className='text-red-500'>
            {recipientValidationState.error}
          </Text>
        )}
      </div>

      {/* Public Key Selection */}
      <PublicKeySelect
        keys={publicKeys}
        value={formData.selectedKeyId ?? ''}
        onChange={(keyId) => setFormData(prev => ({ ...prev, selectedKeyId: keyId }))}
        loading={signingKeysState.loading}
        error={signingKeysState.error}
        keyRequirements={keyRequirements}
      />

      {/* password */}
      <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>
        Password
      </Text>
      <Input
        type='password'
        size='xl'
        value={formData.password}
        onChange={(e) => handleInputChange('password', e.target.value)}
        placeholder='Extension password'
        className='w-full'
      />

      {/* Error Message */}
      {error && (
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
          size='lg'
          className='w-full'
          onClick={handleNext}
          disabled={isLoading || !formData.password.trim()}
        >
          Next
        </Button>
      </div>

      {/* Asset Selection Menu */}
      <AssetSelectionMenu
        isOpen={showAssetSelection}
        onClose={() => setShowAssetSelection(false)}
        selectedAsset={formData.selectedAsset as 'dash' | 'credits'}
        onAssetSelect={handleAssetSelect}
        creditsBalance={balance ? balance.toString() : undefined}
      />
    </div>
  )
}

export default withAccessControl(SendTransactionState, { requireWallet: true })
