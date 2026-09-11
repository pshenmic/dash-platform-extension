import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useOutletContext, useLocation, useSearchParams } from 'react-router-dom'
import { Button, Text } from 'dash-ui-kit/react'
import { AssetSelectionMenu, AssetSelectorBadge, buildAssetOptions } from '../../components/controls'
import { TransferSummaryCard } from '../../components/cards'
import { AmountInputSection } from '../../components/forms'
import { withAccessControl } from '../../components/auth/withAccessControl'
import {
  useSendTransactionForm,
  useTransactionCalculations
} from '../../hooks'
import { RecipientSearchInput } from '../../components/Identities'
import LoadingScreen from '../../components/layout/screens/LoadingScreen'
import type { TokenData } from '../../../types'
import type { OutletContext } from '../../types'
import { WalletType } from '../../../types'
import { ESTIMATED_FEES } from '../../constants/transaction'
import { TRANSFER_FEE_CREDITS, SHIELDED_SPEND_FEE_CREDITS } from '../../../constants'
import {
  getFormattedBalance,
  getAssetLabel,
  getAssetDecimals
} from '../../../utils/transactionFormatters'
import { AssetBalanceLabel } from '../../components/data'
import { parseCreditsAmount } from '../../../utils'
import type { SenderType, TransferMode } from './types'
import { parseSendScope } from '../../utils/sendPath'
import { SHIELDED_POOL_OPTIONS } from './constants'
import { buildTransferSummary } from './transferSummary'
import { usePlatformAddresses } from './hooks/usePlatformAddresses'
import { useIdentityBalances } from './hooks/useIdentityBalances'
import { useShieldedBalance } from './hooks/useShieldedBalance'
import { useSendSubmit } from './hooks/useSendSubmit'
import { useSendScreenData } from './hooks/useSendScreenData'
import { useIdentityHeader } from './hooks/useIdentityHeader'
import { SenderSelector } from './components/SenderSelector'
import { ShieldedSenderPanel } from './components/ShieldedSenderPanel'
import { AssetSelectionStep } from './components/AssetSelectionStep'
import { SendValidationBanners } from './components/SendValidationBanners'

function SendTransactionState (): React.JSX.Element {
  const location = useLocation()
  const { currentNetwork, currentIdentity, setHeaderComponent, allWallets, currentWallet, availableIdentities } = useOutletContext<OutletContext>()
  const locationState = location.state as { selectedToken?: string } | null
  const [searchParams] = useSearchParams()
  const [showAssetSelection, setShowAssetSelection] = useState(false)

  // Tokens belong to a single identity, so they are only offered when the screen
  // was opened from that identity's dashboard. Every other entry sends credits.
  const sendScope = parseSendScope(searchParams.get('scope'))
  const scopeIdentity = sendScope === 'identity' ? searchParams.get('identity') : null
  const tokensEnabled = scopeIdentity != null && scopeIdentity !== ''

  const [assetChosen, setAssetChosen] = useState(locationState?.selectedToken != null)
  const [senderType, setSenderType] = useState<SenderType>('identity')
  const [selectedPlatformAddress, setSelectedPlatformAddress] = useState<string | null>(null)
  const [selectedShieldedAddress, setSelectedShieldedAddress] = useState<string | null>(null)
  // An identity scope names its sender, so the selector starts there instead of
  // on whichever identity happens to be current.
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(tokensEnabled ? scopeIdentity : null)
  const senderIdentity = selectedIdentity ?? currentIdentity

  // Sender balance, exchange rate and token list.
  const { balance, rate, tokensState } = useSendScreenData({
    senderIdentity,
    tokensIdentity: tokensEnabled ? scopeIdentity : null,
    currentNetwork
  })

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
  // Restricting the spend to one shielded address caps the amount at what that
  // address holds; spending the whole pool uses the aggregate.
  const shieldedSenderBalance = selectedShieldedAddress != null
    ? shielded.addresses.find(entry => entry.address === selectedShieldedAddress)?.balance ?? null
    : shielded.balance
  const senderBalance = senderType === 'platform'
    ? selectedPlatformBalance
    : senderType === 'shielded'
      ? shieldedSenderBalance
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
      ? selectedShieldedAddress
      : senderIdentity
  // The recipient identity (if any), kept out of the sender identity selector.
  const recipientIdentity = formState.selectedRecipient?.type === 'identity' ? formState.selectedRecipient.identifier : null
  const isSameParty = formState.selectedRecipient != null &&
    senderIdentifier != null &&
    formState.selectedRecipient.identifier === senderIdentifier

  // Recipients paid through a platform transfer (flat fee).
  // Identity -> Core (L1) is an identity withdrawal, so it is not one of them.
  const isAddressRecipient = recipientType != null && recipientType !== 'identity' &&
    !(senderType === 'identity' && recipientType === 'coreAddress')

  // Resolve the transfer action from the sender × recipient matrix (see the table
  // in PLATFORM_ADDRESSES_UI_TODO.md). Anything not matched has no API → 'unsupported'.
  const transferMode: TransferMode = useMemo(() => {
    if (formState.selectedRecipient == null) return 'incomplete'
    if (!isCredits) return 'tokenTransfer'
    if (senderType === 'identity') {
      if (recipientType === 'platformAddress') return 'fund'
      if (recipientType === 'identity') return 'creditTransfer'
      if (recipientType === 'coreAddress') return 'identityWithdraw'
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

  const shieldedSourceSupported = transferMode === 'incomplete' || transferMode === 'shieldedTransfer'

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
    selectedShieldedAddress: shieldedSourceSupported ? selectedShieldedAddress : null,
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

  useIdentityHeader({ currentIdentity, currentWallet, allWallets, currentNetwork, setHeaderComponent })

  // Tokens can only be transferred between identities, so a token asset forces
  // the sender back to Identity.
  useEffect(() => {
    if (!isCredits && senderType !== 'identity') {
      setSenderType('identity')
    }
  }, [isCredits, senderType])

  // Drop a picked shielded source when the resolved transfer can't spend from it,
  // or when a re-read of the pool no longer reports that address.
  useEffect(() => {
    if (selectedShieldedAddress === null) return

    const stillPresent = shielded.addresses.some(entry => entry.address === selectedShieldedAddress)

    if (!shieldedSourceSupported || !stillPresent) {
      setSelectedShieldedAddress(null)
    }
  }, [shieldedSourceSupported, selectedShieldedAddress, shielded.addresses])

  // Clamp the amount to the sender's available balance whenever the sender
  // changes: async (identity balance loads) in Case 1, sync (sender type /
  // platform address) in Case 2.
  const prevBalanceRef = useRef<bigint | null>(null)

  // Case 1: identity balance loaded/changed -> clamp if needed
  useEffect(() => {
    const prev = prevBalanceRef.current
    prevBalanceRef.current = balance

    // Skip initial null -> first value transition and cases with no amount
    if (prev === null || balance === null || balance === prev) return
    if (formState.formData.amount === '' || formState.formData.amount === '.') return

    const network = currentNetwork ?? 'testnet'
    const isPlatformRecipient = isAddressRecipient
    const fee = isPlatformRecipient ? platformFeeCredits : ESTIMATED_FEES[network].credits
    const available = balance - fee

    if (available <= 0n || Number(formState.formData.amount) > Number(available)) {
      formState.handleQuickAmount(1)
    }
  }, [balance])

  // Case 2: sender type or platform address changed -> clamp against known balances
  const isMountedSenderRef = useRef(false)
  useEffect(() => {
    if (!isMountedSenderRef.current) {
      isMountedSenderRef.current = true
      return
    }
    if (formState.formData.amount === '' || formState.formData.amount === '.') return

    if (senderType === 'platform' || senderType === 'shielded') {
      // Spendable funds of the new sender; unknown (no address / pool locked) -> clear.
      const sourceBalance = senderType === 'platform'
        ? (selectedPlatformAddress !== null ? platformBalances.get(selectedPlatformAddress) ?? null : null)
        : shieldedSenderBalance

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
      const network = currentNetwork ?? 'testnet'
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
  }, [senderType, selectedPlatformAddress, selectedShieldedAddress, shieldedSenderBalance])

  const formattedBalance = getFormattedBalance(formState.formData.selectedAsset, balance, token)
  const assetLabel = getAssetLabel(formState.formData.selectedAsset, token)
  const assetDecimals = getAssetDecimals(formState.formData.selectedAsset, token)

  // Available balance for the percentage slider — for credits, fee is deducted so
  // 100% on the slider matches exactly what Max produces.
  const availableBalanceForSlider = useMemo((): string | null => {
    if (isCredits) {
      if (senderBalance === null || senderBalance === 0n) return null
      const network = currentNetwork ?? 'testnet'
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

  const tokensReady = tokensState.data !== null || tokensState.error !== null

  // Options for the initial "what to send" step (Credits + any tokens).
  const assetOptions = useMemo(() => buildAssetOptions(tokensState.data ?? []), [tokensState.data])

  const summary = buildTransferSummary({
    isCredits,
    isPlatformMode,
    amount: formState.formData.amount,
    platformFeeCredits,
    estimatedFeeCredits: calculations.getEstimatedFeeBigInt(),
    tokenWillBeSent: calculations.getWillBeSentAmount(),
    tokenTotal: calculations.getTotalAmount(),
    tokenUnit: calculations.getTotalAmountUnit()
  })

  // Note selection happens after the (slow) proof starts, so check up front that
  // the chosen shielded source covers the amount plus its fee.
  const shieldedSourceShortfall = useMemo((): boolean => {
    if (senderType !== 'shielded' || shieldedSenderBalance === null) return false

    const amountCredits = parseCreditsAmount(formState.formData.amount)

    return amountCredits !== null && amountCredits + SHIELDED_SPEND_FEE_CREDITS > shieldedSenderBalance
  }, [senderType, shieldedSenderBalance, formState.formData.amount])

  // Modes that spend from a platform address need one selected.
  const spendsFromPlatformAddress = transferMode === 'send' || transferMode === 'topup' ||
    transferMode === 'withdraw' || transferMode === 'shield'

  const nextDisabled = isLoading ||
    formState.selectedRecipient === null ||
    formState.formData.amount === '' ||
    formState.amountError !== null ||
    isSameParty ||
    transferMode === 'unsupported' ||
    (spendsFromPlatformAddress && selectedPlatformAddress === null) ||
    // Spending shielded notes needs the pool unlocked first (known balance)
    // and the prover fully warmed - starting a spend mid-warm-up would race
    // the builder cache.
    (senderType === 'shielded' && (shielded.balance === null || shielded.isWarmingProver)) ||
    shieldedSourceShortfall

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

            {tokensEnabled && (
              <AssetSelectorBadge
                selectedAsset={formState.formData.selectedAsset}
                token={token}
                onClick={() => setShowAssetSelection(true)}
              />
            )}
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
          allowCoreAddress={isCredits}
          allowShieldAddress={isCredits && senderType === 'shielded'}
          pinnedRecipients={isCredits && senderType === 'platform' ? SHIELDED_POOL_OPTIONS : undefined}
          network={currentNetwork ?? 'testnet'}
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
              addresses={shielded.addresses}
              selectedAddress={selectedShieldedAddress}
              onAddressChange={setSelectedShieldedAddress}
              sourceSelectionSupported={shieldedSourceSupported}
              isUnlocking={shielded.isUnlocking}
              isWarmingProver={shielded.isWarmingProver}
              error={shielded.error}
              rate={rate}
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

      {/* Validation and mode warnings */}
      <SendValidationBanners
        formError={formState.error ?? null}
        amountError={formState.amountError}
        isSameParty={isSameParty}
        transferMode={transferMode}
        shieldedSourceShortfall={shieldedSourceShortfall}
        selectedShieldedAddress={selectedShieldedAddress}
      />

      {/* Transaction Summary Card - hidden while the amount is out of limits */}
      {formState.amountError === null && (
        <TransferSummaryCard
          fees={summary.fees}
          willBeSent={summary.willBeSent}
          total={summary.total}
          unit={summary.unit}
          hasAmount={summary.hasAmount}
          selectedAsset={formState.formData.selectedAsset}
        />
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
          disabled={nextDisabled}
        >
          {isLoading
            ? 'Creating Transaction...'
            : (senderType === 'shielded' && shielded.isWarmingProver)
                ? 'Preparing private prover...'
                : 'Next'}
        </Button>
      </div>

      {/* Asset Selection Menu */}
      <AssetSelectionMenu
        isOpen={tokensEnabled && showAssetSelection}
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
