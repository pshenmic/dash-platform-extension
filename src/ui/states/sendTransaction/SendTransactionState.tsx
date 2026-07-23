import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useOutletContext, useLocation } from 'react-router-dom'
import { Button, Text } from 'dash-ui-kit/react'
import { AssetSelectionMenu, AssetSelectorBadge, buildAssetOptions } from '../../components/controls'
import { TransferSummaryCard, Banner } from '../../components/cards'
import { AmountInputSection } from '../../components/forms'
import { withAccessControl } from '../../components/auth/withAccessControl'
import {
  useAsyncState,
  useSdk,
  usePlatformExplorerClient,
  useSendTransactionForm,
  useTransactionCalculations
} from '../../hooks'
import { RecipientSearchInput } from '../../components/Identities'
import IdentityHeaderBadge from '../../components/identity/IdentityHeaderBadge'
import LoadingScreen from '../../components/layout/LoadingScreen'
import type { NetworkType, TokenData } from '../../../types'
import type { OutletContext } from '../../types'
import { WalletType } from '../../../types'
import { ESTIMATED_FEES } from '../../constants/transaction'
import { TRANSFER_FEE_CREDITS } from '../../../constants'
import {
  getFormattedBalance,
  getAssetLabel,
  getAssetDecimals
} from '../../../utils/transactionFormatters'
import { AssetBalanceLabel } from '../../components/data'
import type { SenderType, TransferMode } from './types'
import { usePlatformAddresses } from './hooks/usePlatformAddresses'
import { useIdentityBalances } from './hooks/useIdentityBalances'
import { useSendSubmit } from './hooks/useSendSubmit'
import { SenderSelector } from './components/SenderSelector'
import { AssetSelectionStep } from './components/AssetSelectionStep'

function SendTransactionState (): React.JSX.Element {
  const location = useLocation()
  const sdk = useSdk()
  const platformExplorerClient = usePlatformExplorerClient()
  const { currentNetwork, currentIdentity, setHeaderComponent, allWallets, currentWallet, availableIdentities } = useOutletContext<OutletContext>()
  const locationState = location.state as { selectedToken?: string } | null
  const [balance, setBalance] = useState<bigint | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [tokensState, loadTokens] = useAsyncState<TokenData[]>()
  const [showAssetSelection, setShowAssetSelection] = useState(false)

  const [assetChosen, setAssetChosen] = useState(locationState?.selectedToken != null)
  const [senderType, setSenderType] = useState<SenderType>('identity')
  const [selectedPlatformAddress, setSelectedPlatformAddress] = useState<string | null>(null)
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null)
  const senderIdentity = selectedIdentity ?? currentIdentity

  // Wallet type of the current wallet (platform transfers are seedphrase-only).
  const walletType = useMemo((): string | null => {
    if (currentWallet == null || allWallets == null) return null
    return allWallets.find(wallet => wallet.walletId === currentWallet)?.type ?? null
  }, [allWallets, currentWallet])

  // Platform addresses + balances (seedphrase wallets only).
  const { platformAddresses, platformBalances } = usePlatformAddresses(walletType, currentWallet)

  // The new sender-selection flow is only offered for seedphrase wallets that
  // have already initialized (created) platform addresses.
  const platformFlowEnabled = walletType === WalletType.seedphrase && platformAddresses.length > 0

  // Balances for the sender identity selector — only needed for the platform flow.
  const { identityBalances, identityBalancesLoading } = useIdentityBalances(platformFlowEnabled, availableIdentities)

  // Balance of the currently selected sender: the chosen platform address when
  // sending from an address, otherwise the identity credit balance. Drives the
  // amount Max/slider so it never exceeds the funds actually available to spend.
  const selectedPlatformBalance = selectedPlatformAddress != null
    ? platformBalances.get(selectedPlatformAddress) ?? null
    : null
  const senderBalance = senderType === 'platform' ? selectedPlatformBalance : balance

  // Form state hook
  const formState = useSendTransactionForm({
    balance: senderBalance,
    rate,
    currentNetwork,
    tokens: tokensState.data ?? [],
    platformTransfer: senderType === 'platform'
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

  const isCredits = formState.formData.selectedAsset === 'credits'
  const recipientType = formState.selectedRecipient?.type ?? null

  // The current sender identifier (identity or platform address), used to keep it
  // out of the recipient field and to block sending to oneself.
  const senderIdentifier = senderType === 'platform' ? selectedPlatformAddress : senderIdentity
  // The recipient identity (if any), kept out of the sender identity selector.
  const recipientIdentity = formState.selectedRecipient?.type === 'identity' ? formState.selectedRecipient.identifier : null
  const isSameParty = formState.selectedRecipient != null &&
    senderIdentifier != null &&
    formState.selectedRecipient.identifier === senderIdentifier

  // Resolve which transfer action the current form maps to.
  const transferMode: TransferMode = useMemo(() => {
    if (formState.selectedRecipient == null) return 'incomplete'
    if (!isCredits) return 'tokenTransfer'
    if (senderType === 'identity') {
      return recipientType === 'platformAddress' ? 'fund' : 'creditTransfer'
    }
    return recipientType === 'platformAddress' ? 'send' : 'topup'
  }, [formState.selectedRecipient, isCredits, senderType, recipientType])

  // Whether the fee/summary should reflect a platform transfer. Driven by the
  // sender type (and recipient) rather than the fully-resolved transferMode, so
  // switching the sender to a platform address updates the fee immediately.
  const isPlatformMode = isCredits && (senderType === 'platform' || recipientType === 'platformAddress')

  const token = getSelectedToken()

  const { isLoading, handleSend } = useSendSubmit({
    currentIdentity,
    selectedIdentity,
    formState,
    transferMode,
    isSameParty,
    selectedPlatformAddress,
    token
  })

  // Set selected token from navigation state
  useEffect(() => {
    if (locationState?.selectedToken != null && tokensState.data != null) {
      const tokenExists = tokensState.data.some(token => token.identifier === locationState.selectedToken)
      if (tokenExists) {
        formState.handleAssetSelect(locationState.selectedToken)
        setAssetChosen(true)
      }

      window.history.replaceState({}, document.title)
    }
  }, [locationState, tokensState.data, formState.handleAssetSelect])

  // Load balance, tokens and exchange rate on component mount
  useEffect(() => {
    const loadBalance = async (): Promise<void> => {
      if ((senderIdentity !== null && senderIdentity !== undefined)) {
        try {
          const identityBalance = await sdk.identities.getIdentityBalance(senderIdentity)
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
  }, [senderIdentity, sdk, currentNetwork, platformExplorerClient])

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
        <IdentityHeaderBadge identity={currentIdentity} walletName={getWalletName()} />
      )
    }

    // Clear header component on unmount
    return () => {
      setHeaderComponent(null)
    }
  }, [currentIdentity, currentWallet, allWallets, currentNetwork, setHeaderComponent])

  // Tokens can only be transferred between identities, so a token asset forces
  // the sender back to Identity.
  useEffect(() => {
    if (!isCredits && senderType !== 'identity') {
      setSenderType('identity')
    }
  }, [isCredits, senderType])

  // Clamp the amount to the sender's available balance whenever the sender
  // changes: async (identity balance loads) in Case 1, sync (sender type /
  // platform address) in Case 2.
  const prevBalanceRef = useRef<bigint | null>(null)

  // Case 1: identity balance loaded/changed → clamp if needed
  useEffect(() => {
    const prev = prevBalanceRef.current
    prevBalanceRef.current = balance

    // Skip initial null → first value transition and cases with no amount
    if (prev === null || balance === null || balance === prev) return
    if (formState.formData.amount === '' || formState.formData.amount === '.') return

    const network = (currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'
    const isPlatformRecipient = formState.selectedRecipient?.type === 'platformAddress'
    const fee = isPlatformRecipient ? TRANSFER_FEE_CREDITS : ESTIMATED_FEES[network].credits
    const available = balance - fee

    if (available <= 0n || Number(formState.formData.amount) > Number(available)) {
      formState.handleQuickAmount(1)
    }
  }, [balance])

  // Case 2: sender type or platform address changed → clamp against known balances
  const isMountedSenderRef = useRef(false)
  useEffect(() => {
    if (!isMountedSenderRef.current) {
      isMountedSenderRef.current = true
      return
    }
    if (formState.formData.amount === '' || formState.formData.amount === '.') return

    if (senderType === 'platform') {
      if (selectedPlatformAddress === null) {
        // No platform address selected yet → clear amount, nothing to send from
        formState.handleAmountChange('')
        return
      }
      const platformBal = platformBalances.get(selectedPlatformAddress)
      if (platformBal == null) {
        formState.handleAmountChange('')
        return
      }
      const available = platformBal > TRANSFER_FEE_CREDITS ? platformBal - TRANSFER_FEE_CREDITS : 0n
      if (available <= 0n || Number(formState.formData.amount) > Number(available)) {
        if (available <= 0n) {
          formState.handleAmountChange('')
        } else {
          formState.handleQuickAmount(1)
        }
      }
    } else if (balance !== null) {
      // Switched back to identity — balance already reflects current identity
      const network = (currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'
      const isPlatformRecipient = formState.selectedRecipient?.type === 'platformAddress'
      const fee = isPlatformRecipient ? TRANSFER_FEE_CREDITS : ESTIMATED_FEES[network].credits
      const available = balance - fee
      if (available <= 0n || Number(formState.formData.amount) > Number(available)) {
        if (available <= 0n) {
          formState.handleAmountChange('')
        } else {
          formState.handleQuickAmount(1)
        }
      }
    }
  }, [senderType, selectedPlatformAddress])

  const formattedBalance = getFormattedBalance(formState.formData.selectedAsset, balance, token)
  const assetLabel = getAssetLabel(formState.formData.selectedAsset, token)
  const assetDecimals = getAssetDecimals(formState.formData.selectedAsset, token)

  // Available balance for the percentage slider — for credits, fee is deducted so
  // 100% on the slider matches exactly what Max produces.
  const availableBalanceForSlider = useMemo((): string | null => {
    if (isCredits) {
      if (senderBalance === null || senderBalance === 0n) return null
      const network = (currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'
      const isPlatformTransfer = senderType === 'platform' || formState.selectedRecipient?.type === 'platformAddress'
      const fee = isPlatformTransfer ? TRANSFER_FEE_CREDITS : ESTIMATED_FEES[network].credits
      const available = senderBalance - fee
      return available > 0n ? available.toString() : null
    }
    return formattedBalance !== '0' ? formattedBalance : null
  }, [isCredits, senderBalance, senderType, currentNetwork, formState.selectedRecipient, formattedBalance])

  // The sender block (with its own balance display) only shows for the platform
  // flow with credits. Otherwise the balance is shown under the title.
  const senderBlockShown = platformFlowEnabled && isCredits
  const showHeaderBalance = !senderBlockShown &&
    ((isCredits && balance !== null) || (!isCredits && token != null))

  const hasTokens = (tokensState.data?.length ?? 0) > 0

  const tokensReady = tokensState.data !== null || tokensState.error !== null || currentIdentity == null

  // Options for the initial "what to send" step (Credits + any tokens).
  const assetOptions = useMemo(() => buildAssetOptions(tokensState.data ?? []), [tokensState.data])

  // Summary values, switching to the flat platform fee for fund/send.
  const summaryFees = isPlatformMode ? `~${TRANSFER_FEE_CREDITS.toLocaleString()}` : calculations.getEstimatedFee()
  const summaryWillBeSent = isPlatformMode
    ? (formState.formData.amount !== '' ? BigInt(Math.floor(Number(formState.formData.amount))).toLocaleString() : '0')
    : calculations.getWillBeSentAmount()
  const summaryTotal = isPlatformMode
    ? (formState.formData.amount !== ''
        ? (BigInt(Math.floor(Number(formState.formData.amount))) + TRANSFER_FEE_CREDITS).toLocaleString()
        : TRANSFER_FEE_CREDITS.toLocaleString())
    : calculations.getTotalAmount()
  const summaryUnit = isPlatformMode ? 'Credits' : calculations.getTotalAmountUnit()

  const nextDisabled = isLoading ||
    formState.selectedRecipient === null ||
    formState.formData.amount === '' ||
    isSameParty ||
    ((transferMode === 'send' || transferMode === 'topup') && selectedPlatformAddress === null)

  if (!tokensReady) {
    return (
      <div className='screen-content'>
        <LoadingScreen />
      </div>
    )
  }

  // Initial asset-selection step: only shown when the identity holds tokens and
  // no asset has been chosen yet (single-asset wallets skip straight to Credits).
  if (hasTokens && !assetChosen) {
    return (
      <AssetSelectionStep
        assetOptions={assetOptions}
        balance={balance}
        onSelect={(assetValue) => {
          formState.handleAssetSelect(assetValue)
          setAssetChosen(true)
        }}
      />
    )
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

            <AssetSelectorBadge
              selectedAsset={formState.formData.selectedAsset}
              token={token}
              onClick={() => setShowAssetSelection(true)}
            />
          </div>

          {/* Balance Display — shown here when the sender block isn't */}
          {showHeaderBalance && (
            <AssetBalanceLabel
              balance={formattedBalance}
              unit={assetLabel}
              usdValue={calculations.getBalanceUSDValue()}
            />
          )}
        </div>

        {/* Description */}
        <Text size='xs' weight='medium' className='text-dash-primary-dark-blue opacity-50' dim>
          You are going to transfer {formState.formData.selectedAsset === 'credits' ? 'credits' : 'tokens'} from your account with this transaction. Carefully check the transaction details before proceeding to the next step.
        </Text>
      </div>

      {/* Recipient Input */}
      <div className='flex flex-col gap-2.5'>
        <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>
          Recipient
        </Text>
        <RecipientSearchInput
          value={formState.formData.recipient}
          onChange={formState.handleRecipientChange}
          onSelect={formState.handleRecipientSelect}
          excludeIdentifier={senderIdentifier}
          placeholder='Enter recipient identity or address'
          allowPlatformAddress={isCredits}
          network={(currentNetwork ?? 'testnet') as NetworkType}
        />
      </div>

      {/* Sender selection (platform flow only, credits only) */}
      {platformFlowEnabled && isCredits && (
        <SenderSelector
          senderType={senderType}
          onSenderTypeChange={setSenderType}
          availableIdentities={availableIdentities}
          senderIdentity={senderIdentity}
          onIdentityChange={setSelectedIdentity}
          recipientIdentity={recipientIdentity}
          identityBalances={identityBalances}
          identityBalancesLoading={identityBalancesLoading}
          platformAddresses={platformAddresses}
          platformBalances={platformBalances}
          selectedPlatformAddress={selectedPlatformAddress}
          onPlatformAddressChange={setSelectedPlatformAddress}
          rate={rate}
        />
      )}

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
        maxBalance={availableBalanceForSlider}
      />

      {/* Error Message */}
      <Banner variant='error' message={formState.error ?? null} />
      {isSameParty && (
        <Banner variant='error' message='Recipient must be different from the sender' />
      )}

      {/* Transaction Summary Card */}
      <TransferSummaryCard
        fees={summaryFees}
        willBeSent={summaryWillBeSent}
        total={summaryTotal}
        unit={summaryUnit}
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
          disabled={nextDisabled}
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
