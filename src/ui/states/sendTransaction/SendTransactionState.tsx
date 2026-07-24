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
import { TRANSFER_FEE_CREDITS, SHIELDED_SPEND_FEE_CREDITS, SHIELDED_POOL_RECIPIENT } from '../../../constants'
import {
  getFormattedBalance,
  getAssetLabel,
  getAssetDecimals
} from '../../../utils/transactionFormatters'
import { AssetBalanceLabel } from '../../components/data'
import type { RecipientSearchResult } from '../../../utils'
import type { SenderType, TransferMode } from './types'
import { usePlatformAddresses } from './hooks/usePlatformAddresses'
import { useIdentityBalances } from './hooks/useIdentityBalances'
import { useShieldedBalance } from './hooks/useShieldedBalance'
import { useSendSubmit } from './hooks/useSendSubmit'
import { SenderSelector } from './components/SenderSelector'
import { ShieldedSenderPanel } from './components/ShieldedSenderPanel'
import { AssetSelectionStep } from './components/AssetSelectionStep'

// Shown when the sender can't pay the chosen recipient type (no API for it).
const UNSUPPORTED_TRANSFER_MESSAGE = 'This sender cannot pay this recipient. Change the sender or the recipient.'

// `shieldToPool` can only reach the wallet's own pool — a fixed choice, not typed.
const SHIELDED_POOL_OPTIONS: RecipientSearchResult[] = [{
  identifier: SHIELDED_POOL_RECIPIENT,
  type: 'shieldedPool',
  label: 'My shielded balance'
}]

// Caution shown on the send screen per resolved mode.
const MODE_WARNINGS: Partial<Record<TransferMode, string>> = {
  withdraw: 'Withdrawals leave Platform for the Dash (L1) network. They are irreversible, pay an additional L1 network fee and can take several minutes to settle.',
  shieldedWithdraw: 'Withdrawing to Core reveals the amount and the destination on L1 — the privacy of this exit is lost. It is irreversible and pays an additional L1 network fee.',
  shield: 'Private transfers build a zero-knowledge proof, which can take several minutes in the popup.',
  unshield: 'Private transfers build a zero-knowledge proof, which can take several minutes in the popup. Unshielding also reveals the amount to the receiving address.',
  shieldedTransfer: 'Private transfers build a zero-knowledge proof, which can take several minutes in the popup.'
}

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

  // Shielded balance — password-gated, so it stays null until the user unlocks it.
  const shielded = useShieldedBalance()

  // Balance of the selected sender (platform address / unlocked pool / identity),
  // driving the amount Max/slider so it can't exceed the spendable funds.
  const selectedPlatformBalance = selectedPlatformAddress != null
    ? platformBalances.get(selectedPlatformAddress) ?? null
    : null
  const senderBalance = senderType === 'platform'
    ? selectedPlatformBalance
    : senderType === 'shielded'
      ? shielded.balance
      : balance

  // Shielded spends estimate their own fee; transparent platform transfers use
  // the flat transfer fee.
  const platformFeeCredits = senderType === 'shielded' ? SHIELDED_SPEND_FEE_CREDITS : TRANSFER_FEE_CREDITS

  // Form state hook
  const formState = useSendTransactionForm({
    balance: senderBalance,
    rate,
    currentNetwork,
    tokens: tokensState.data ?? [],
    platformTransfer: senderType !== 'identity',
    platformFeeCredits
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

  // Sender identifier, used to keep it out of the recipient field and block
  // self-sends. The shielded pool has no identifier to collide with.
  const senderIdentifier = senderType === 'platform'
    ? selectedPlatformAddress
    : senderType === 'shielded'
      ? null
      : senderIdentity
  // The recipient identity (if any), kept out of the sender identity selector.
  const recipientIdentity = formState.selectedRecipient?.type === 'identity' ? formState.selectedRecipient.identifier : null
  const isSameParty = formState.selectedRecipient != null &&
    senderIdentifier != null &&
    formState.selectedRecipient.identifier === senderIdentifier

  // Recipients paid through a platform transfer (flat fee) rather than an
  // identity credit transfer.
  const isAddressRecipient = recipientType != null && recipientType !== 'identity'

  // Resolve the transfer action from the sender × recipient matrix (see the table
  // in PLATFORM_ADDRESSES_UI_TODO.md). Anything not matched has no API → 'unsupported'.
  const transferMode: TransferMode = useMemo(() => {
    if (formState.selectedRecipient == null) return 'incomplete'
    if (!isCredits) return 'tokenTransfer'
    if (senderType === 'identity') {
      if (recipientType === 'platformAddress') return 'fund'
      if (recipientType === 'identity') return 'creditTransfer'
      return 'unsupported'
    }
    if (senderType === 'platform') {
      if (recipientType === 'platformAddress') return 'send'
      if (recipientType === 'identity') return 'topup'
      if (recipientType === 'coreAddress') return 'withdraw'
      if (recipientType === 'shieldedPool') return 'shield'
      return 'unsupported'
    }
    if (recipientType === 'shieldAddress') return 'shieldedTransfer'
    if (recipientType === 'platformAddress') return 'unshield'
    if (recipientType === 'coreAddress') return 'shieldedWithdraw'
    return 'unsupported'
  }, [formState.selectedRecipient, isCredits, senderType, recipientType])

  // Whether the fee/summary should reflect a platform transfer. Driven by the
  // sender type (and recipient) rather than the fully-resolved transferMode, so
  // switching the sender to a platform address updates the fee immediately.
  const isPlatformMode = isCredits && (senderType !== 'identity' || isAddressRecipient)

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
    const isPlatformRecipient = isAddressRecipient
    const fee = isPlatformRecipient ? platformFeeCredits : ESTIMATED_FEES[network].credits
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

    if (senderType === 'platform' || senderType === 'shielded') {
      // Spendable funds of the new sender; unknown (no address / pool locked) → clear.
      const sourceBalance = senderType === 'platform'
        ? (selectedPlatformAddress !== null ? platformBalances.get(selectedPlatformAddress) ?? null : null)
        : shielded.balance

      if (sourceBalance == null) {
        formState.handleAmountChange('')
        return
      }

      const available = sourceBalance > platformFeeCredits ? sourceBalance - platformFeeCredits : 0n
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
      const isPlatformRecipient = isAddressRecipient
      const fee = isPlatformRecipient ? platformFeeCredits : ESTIMATED_FEES[network].credits
      const available = balance - fee
      if (available <= 0n || Number(formState.formData.amount) > Number(available)) {
        if (available <= 0n) {
          formState.handleAmountChange('')
        } else {
          formState.handleQuickAmount(1)
        }
      }
    }
  }, [senderType, selectedPlatformAddress, shielded.balance])

  const formattedBalance = getFormattedBalance(formState.formData.selectedAsset, balance, token)
  const assetLabel = getAssetLabel(formState.formData.selectedAsset, token)
  const assetDecimals = getAssetDecimals(formState.formData.selectedAsset, token)

  // Available balance for the percentage slider — for credits, fee is deducted so
  // 100% on the slider matches exactly what Max produces.
  const availableBalanceForSlider = useMemo((): string | null => {
    if (isCredits) {
      if (senderBalance === null || senderBalance === 0n) return null
      const network = (currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'
      const isPlatformTransfer = senderType !== 'identity' || isAddressRecipient
      const fee = isPlatformTransfer ? platformFeeCredits : ESTIMATED_FEES[network].credits
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
  const summaryFees = isPlatformMode ? `~${platformFeeCredits.toLocaleString()}` : calculations.getEstimatedFee()
  const summaryWillBeSent = isPlatformMode
    ? (formState.formData.amount !== '' ? BigInt(Math.floor(Number(formState.formData.amount))).toLocaleString() : '0')
    : calculations.getWillBeSentAmount()
  const summaryTotal = isPlatformMode
    ? (formState.formData.amount !== ''
        ? (BigInt(Math.floor(Number(formState.formData.amount))) + platformFeeCredits).toLocaleString()
        : platformFeeCredits.toLocaleString())
    : calculations.getTotalAmount()
  const summaryUnit = isPlatformMode ? 'Credits' : calculations.getTotalAmountUnit()

  // Modes that spend from a platform address need one selected.
  const spendsFromPlatformAddress = transferMode === 'send' || transferMode === 'topup' ||
    transferMode === 'withdraw' || transferMode === 'shield'

  const nextDisabled = isLoading ||
    formState.selectedRecipient === null ||
    formState.formData.amount === '' ||
    isSameParty ||
    transferMode === 'unsupported' ||
    (spendsFromPlatformAddress && selectedPlatformAddress === null) ||
    // Spending shielded notes needs the pool unlocked first (known balance).
    (senderType === 'shielded' && shielded.balance === null)

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
          allowCoreAddress={isCredits && senderType !== 'identity'}
          allowShieldAddress={isCredits && senderType === 'shielded'}
          pinnedRecipients={isCredits && senderType === 'platform' ? SHIELDED_POOL_OPTIONS : undefined}
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
          shieldedPanel={
            <ShieldedSenderPanel
              info={shielded.info}
              isUnlocking={shielded.isUnlocking}
              isWarmingProver={shielded.isWarmingProver}
              error={shielded.error}
              onUnlock={(password) => { void shielded.unlock(password) }}
              onErrorClear={() => shielded.clearError()}
            />
          }
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
      {transferMode === 'unsupported' && (
        <Banner variant='error' message={UNSUPPORTED_TRANSFER_MESSAGE} />
      )}
      <Banner variant='warning' message={MODE_WARNINGS[transferMode] ?? null} />

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
