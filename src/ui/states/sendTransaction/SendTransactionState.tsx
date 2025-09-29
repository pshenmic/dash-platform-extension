import React, { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Button,
  Text,
  Input,
  ChevronIcon,
  DashLogo,
  Badge
} from 'dash-ui-kit/react'
import { AutoSizingInput } from '../../components/controls'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useExtensionAPI, useAsyncState, useSdk } from '../../hooks'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { PublicKeySelect, PublicKeyInfo } from '../../components/keys'
import type { OutletContext } from '../../types'
import { PlatformExplorerClient } from '../../../types'
import type { NetworkType } from '../../../types'
import { loadSigningKeys } from '../../../utils'

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
  const { currentNetwork, currentWallet, currentIdentity } = useOutletContext<OutletContext>()

  const [formData, setFormData] = useState<SendFormData>({
    recipient: '',
    amount: '',
    selectedAsset: 'dash',
    selectedKeyId: null,
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<bigint | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [publicKeys, setPublicKeys] = useState<PublicKeyInfo[]>([])
  const [signingKeysState, loadSigningKeysAsync] = useAsyncState<PublicKeyInfo[]>()

  // Load balance and exchange rate on component mount
  useEffect(() => {
    const loadBalance = async () => {
      if (currentIdentity && formData.selectedAsset === 'dash') {
        try {
          const identityBalance = await sdk.identities.getIdentityBalance(currentIdentity)
          setBalance(identityBalance)
        } catch (err) {
          console.error('Failed to load balance:', err)
        }
      }
    }

    const loadRate = async () => {
      try {
        const client = new PlatformExplorerClient()
        const rate = await client.fetchRate((currentNetwork ?? 'testnet') as NetworkType)
        setRate(rate)
      } catch (err) {
        console.log('Failed to load exchange rate:', err)
        setRate(null)
      }
    }

    loadBalance().catch(e => console.log('loadBalance error:', e))
    loadRate().catch(e => console.log('loadRate error:', e))
  }, [currentIdentity, sdk, formData.selectedAsset, currentNetwork])

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

      if (signingKeysState.data.length > 0 && formData.selectedKeyId === null) {
        const firstKey = signingKeysState.data[0]
        const keyValue = firstKey.keyId?.toString() ?? (firstKey.hash !== '' ? firstKey.hash : 'key-0')
        setFormData(prev => ({ ...prev, selectedKeyId: keyValue }))
      }

      return
    }

    setPublicKeys([])

    if (formData.selectedKeyId !== null) {
      setFormData(prev => ({ ...prev, selectedKeyId: null }))
    }
  }, [signingKeysState.data, formData.selectedKeyId])

  const handleInputChange = (field: keyof SendFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleQuickAmount = (percentage: number) => {
    if (balance !== null) {
      const amount = (Number(balance) * percentage).toString()
      setFormData(prev => ({ ...prev, amount }))
    }
  }

  const validateForm = (): string | null => {
    if (!formData.recipient.trim()) {
      return 'Recipient address is required'
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
    if (!rate || !amount) return ''
    const usdValue = Number(amount) * rate
    return `~$${usdValue.toFixed(2)}`
  }

  return (
    <div className='screen-content'>
      <TitleBlock
        title='Send Transaction'
        description='Carefully check the transaction details before continuing'
      />

      {/* Amount Input and Asset Selection */}
      <div className='flex justify-center'>
        <div className='flex items-start gap-[1.125rem]'>
          {/* Amount Input */}
          <div>
            <AutoSizingInput
              value={formData.amount}
              onChange={(value) => handleInputChange('amount', value)}
              placeholder='12.01'
              onChangeFilter={(value) => value.replace(/[^0-9.]/g, '')}
                rightContent={
                  formData.amount && (
                    <Text size='sm' className='text-dash-primary-dark-blue opacity-35 ml-2'>
                      {formatUSDValue(formData.amount)}
                    </Text>
                  )
                }
            />
          </div>

          {/* Asset Selection and Quick Buttons */}
          <div className='flex flex-col gap-1'>
            {/* Asset Selection */}
            <Badge
              color='light-gray'
              variant='flat'
              size='xxs'
              className='flex items-center gap-2 w-max cursor-pointer'
            >
              <div className='w-4 h-4 bg-dash-brand rounded-full flex items-center justify-center'>
                <DashLogo className='!text-white w-2 h-2' />
              </div>
              <Text weight='bold' className='text-dash-primary-dark-blue !text-[0.75rem]'>
                DASH
              </Text>
              <ChevronIcon direction='down' size={8} className='text-dash-primary-dark-blue mr-1' />
            </Badge>

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
          Recipient
        </Text>
        <Input
          value={formData.recipient}
          onChange={(e) => handleInputChange('recipient', e.target.value)}
          placeholder='Enter recipient address'
          size='xl'
          variant='outlined'
        />
      </div>

      {/* Public Key Selection */}
      <PublicKeySelect
        keys={publicKeys}
        value={formData.selectedKeyId ?? ''}
        onChange={(keyId) => setFormData(prev => ({ ...prev, selectedKeyId: keyId }))}
        loading={signingKeysState.loading}
        error={signingKeysState.error}
      />

      {/* Error Message */}
      {error && (
        <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
          <Text size='sm' color='red'>
            {error}
          </Text>
        </div>
      )}

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
    </div>
  )
}

export default withAccessControl(SendTransactionState, { requireWallet: true })
