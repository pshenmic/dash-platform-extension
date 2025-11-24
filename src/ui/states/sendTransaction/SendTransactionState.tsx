import React, { useState, useEffect } from 'react'
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom'
import {
  Button,
  Text,
  Avatar,
  ValueCard,
  Identifier
} from 'dash-ui-kit/react'
import { base64 } from '@scure/base'
import { AssetSelectionMenu, AssetSelectorBadge } from '../../components/controls'
import { TransferSummaryCard } from '../../components/cards'
import { AmountInputSection } from '../../components/forms'
import { withAccessControl } from '../../components/auth/withAccessControl'
import {
  useExtensionAPI,
  useAsyncState,
  useSdk,
  usePlatformExplorerClient,
  useSendTransactionForm,
  useTransactionCalculations
} from '../../hooks'
import { RecipientSearchInput } from '../../components/Identities'
import type { NetworkType, TokenData } from '../../../types'
import type { OutletContext } from '../../types'
import { toBaseUnit } from '../../../utils'
import { MIN_CREDIT_TRANSFER } from '../../constants/transaction'
import {
  getFormattedBalance,
  getAssetLabel,
  getAssetDecimals
} from '../../../utils/transactionFormatters'

function SendTransactionState (): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const platformExplorerClient = usePlatformExplorerClient()
  const { currentNetwork, currentIdentity, setHeaderComponent, allWallets, currentWallet } = useOutletContext<OutletContext>()
  const locationState = location.state as { selectedToken?: string } | null
  const [isLoading, setIsLoading] = useState(false)
  const [balance, setBalance] = useState<bigint | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [tokensState, loadTokens] = useAsyncState<TokenData[]>()
  const [showAssetSelection, setShowAssetSelection] = useState(false)

  // Form state hook
  const formState = useSendTransactionForm({
    balance,
    rate,
    currentNetwork,
    tokens: tokensState.data ?? []
  })

  // Get selected token helper
  const getSelectedToken = (): TokenData | undefined => {
    if (formState.formData.selectedAsset === 'credits') {
      return undefined
    }
    return tokensState.data?.find(token => token.identifier === formState.formData.selectedAsset)
  }

  // Transaction calculations hook
  const calculations = useTransactionCalculations({
    selectedAsset: formState.formData.selectedAsset,
    amount: formState.formData.amount,
    balance,
    rate,
    currentNetwork,
    token: getSelectedToken()
  })

  // Set selected token from navigation state
  useEffect(() => {
    if (locationState?.selectedToken != null && tokensState.data != null) {
      const tokenExists = tokensState.data.some(token => token.identifier === locationState.selectedToken)
      if (tokenExists) {
        formState.handleAssetSelect(locationState.selectedToken)
      }

      window.history.replaceState({}, document.title)
    }
  }, [locationState, tokensState.data, formState.handleAssetSelect])

  // Load balance, tokens and exchange rate on component mount
  useEffect(() => {
    const loadBalance = async (): Promise<void> => {
      if ((currentIdentity !== null && currentIdentity !== undefined)) {
        try {
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
  }, [currentIdentity, sdk, currentNetwork, platformExplorerClient])

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

  const handleSend = async (): Promise<void> => {
    if ((currentIdentity === null || currentIdentity === undefined)) {
      formState.setError('No identity selected')
      return
    }

    // Validate that recipient is selected from search results
    if (formState.selectedRecipient === null) {
      formState.setError('Please select a recipient from search results')
      return
    }

    setIsLoading(true)
    formState.setError(null)

    try {
      if (formState.formData.selectedAsset === 'credits') {
        const amountInCredits = BigInt(Math.floor(Number(formState.formData.amount)))

        // Validate minimum credit transfer amount
        if (amountInCredits < MIN_CREDIT_TRANSFER) {
          formState.setError(`Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`)
          return
        }

        const identityNonce = await sdk.identities.getIdentityNonce(currentIdentity)

        // Create unsigned identity credit transfer state transition
        const stateTransition = sdk.identities.createStateTransition('creditTransfer', {
          identityId: currentIdentity,
          amount: amountInCredits,
          recipientId: formState.selectedRecipient.identifier,
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
          formState.setError('Selected token not found')
          return
        }

        // Convert amount to base units
        const amountInBaseUnits = toBaseUnit(formState.formData.amount, token.decimals, true) as bigint

        // Check if the converted amount is 0
        if (amountInBaseUnits === 0n) {
          formState.setError('Amount is too small')
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
            identityId: formState.selectedRecipient.identifier,
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
      formState.setError(err instanceof Error ? err.message : 'Transaction creation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const token = getSelectedToken()
  const formattedBalance = getFormattedBalance(formState.formData.selectedAsset, balance, token)
  const assetLabel = getAssetLabel(formState.formData.selectedAsset, token)
  const assetDecimals = getAssetDecimals(formState.formData.selectedAsset, token)

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

            <AssetSelectorBadge
              selectedAsset={formState.formData.selectedAsset}
              token={token}
              onClick={() => setShowAssetSelection(true)}
            />
          </div>

          {/* Balance Display */}
          {((formState.formData.selectedAsset === 'credits' && balance !== null) || (formState.formData.selectedAsset !== 'credits' && token != null)) && (
            <div className='flex items-center gap-3'>
              <div className='flex gap-1'>
                <Text className='!text-[0.75rem]' dim>Balance:</Text>
                <Text weight='bold' className='!text-[0.75rem]'>{formattedBalance}</Text>
                <Text className='!text-[0.75rem]'>{assetLabel}</Text>
              </div>
              {calculations.getBalanceUSDValue() !== null && (
                <ValueCard border={false} size='xs' className='px-[0.313rem] py-[0.156rem]' colorScheme='lightGray'>
                  <Text size='xs' weight='light' className='text-dash-primary-dark-blue !text-[0.625rem] !leading-[1.2]'>
                    {calculations.getBalanceUSDValue()}
                  </Text>
                </ValueCard>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <Text size='xs' weight='medium' className='text-dash-primary-dark-blue opacity-50' dim>
          You are going to transfer {formState.formData.selectedAsset === 'credits' ? 'credits' : 'tokens'} from your account with this transaction. Carefully check the transaction details before proceeding to the next step.
        </Text>
      </div>

      {/* Amount Input Section */}
      <AmountInputSection
        amount={formState.formData.amount}
        equivalentAmount={formState.equivalentAmount}
        onAmountChange={formState.handleAmountChange}
        onEquivalentChange={formState.handleEquivalentChange}
        onQuickAmount={formState.handleQuickAmount}
        selectedAsset={formState.formData.selectedAsset}
        equivalentCurrency={formState.equivalentCurrency}
        onEquivalentCurrencyChange={formState.handleEquivalentCurrencyChange}
        assetDecimals={assetDecimals}
      />

      {/* Recipient Input */}
      <div className='flex flex-col gap-2.5'>
        <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>
          Recipient
        </Text>
        <RecipientSearchInput
          value={formState.formData.recipient}
          onChange={formState.handleRecipientChange}
          onSelect={formState.handleRecipientSelect}
          currentIdentity={currentIdentity}
          placeholder='Enter recipient identity identifier or name'
        />
      </div>

      {/* Error Message */}
      {(formState.error !== null && formState.error !== undefined) && (
        <ValueCard colorScheme='yellow'>
          {formState.error}
        </ValueCard>
      )}

      {/* Transaction Summary Card */}
      <TransferSummaryCard
        fees={calculations.getEstimatedFee()}
        willBeSent={calculations.getWillBeSentAmount()}
        total={calculations.getTotalAmount()}
        unit={calculations.getTotalAmountUnit()}
        selectedAsset={formState.formData.selectedAsset}
      />

      {/* Action Button */}
      <div className='flex flex-col gap-4'>
        <Button
          colorScheme='brand'
          size='xl'
          className='w-full'
          onClick={() => {
            handleSend().catch(e => console.log('handleSend error', e))
          }}
          disabled={isLoading || formState.selectedRecipient === null || formState.formData.amount === ''}
        >
          {isLoading ? 'Creating Transaction...' : 'Next'}
        </Button>
      </div>

      {/* Asset Selection Menu */}
      <AssetSelectionMenu
        isOpen={showAssetSelection}
        onClose={() => setShowAssetSelection(false)}
        selectedAsset={formState.formData.selectedAsset}
        onAssetSelect={formState.handleAssetSelect}
        creditsBalance={(balance !== null && balance !== undefined) ? balance.toString() : undefined}
        tokens={tokensState.data ?? []}
      />
    </div>
  )
}

export default withAccessControl(SendTransactionState, { requireWallet: true })
