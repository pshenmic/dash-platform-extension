import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom'
import {
  Button,
  Text,
  Identifier,
  Select,
  ValueCard,
  Avatar
} from 'dash-ui-kit/react'
import { base64 } from '@scure/base'
import { AssetSelectionMenu, AssetSelectorBadge, AssetOptionCard, SelectableCard, buildAssetOptions, formatAssetBalance } from '../../components/controls'
import { TransferSummaryCard, Banner } from '../../components/cards'
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
import { IdentitySelect } from '../../components/identity'
import IdentityHeaderBadge from '../../components/identity/IdentityHeaderBadge'
import LoadingScreen from '../../components/layout/LoadingScreen'
import type { NetworkType, TokenData } from '../../../types'
import type { OutletContext } from '../../types'
import { WalletType } from '../../../types'
import { toBaseUnit, creditsToDashBigInt } from '../../../utils'
import { MIN_CREDIT_TRANSFER, ESTIMATED_FEES } from '../../constants/transaction'
import { TRANSFER_FEE_CREDITS, MIN_OUTPUT_CREDITS } from '../../../constants'
import {
  getFormattedBalance,
  getAssetLabel,
  getAssetDecimals
} from '../../../utils/transactionFormatters'
import { AssetBalanceLabel } from '../../components/data'

// Resolved action, derived from asset + sender type + recipient kind.
type TransferMode = 'creditTransfer' | 'tokenTransfer' | 'fund' | 'send' | 'topup' | 'incomplete'
type SenderType = 'identity' | 'platform'

interface PlatformAddressEntry {
  address: string
  derivationPath: string
  index: number
}

function SendTransactionState (): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const platformExplorerClient = usePlatformExplorerClient()
  const { currentNetwork, currentIdentity, setHeaderComponent, allWallets, currentWallet, availableIdentities } = useOutletContext<OutletContext>()
  const locationState = location.state as { selectedToken?: string } | null
  const [isLoading, setIsLoading] = useState(false)
  const [balance, setBalance] = useState<bigint | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [tokensState, loadTokens] = useAsyncState<TokenData[]>()
  const [showAssetSelection, setShowAssetSelection] = useState(false)

  const [assetChosen, setAssetChosen] = useState(locationState?.selectedToken != null)
  const [senderType, setSenderType] = useState<SenderType>('identity')
  const [platformAddresses, setPlatformAddresses] = useState<PlatformAddressEntry[]>([])
  const [platformBalances, setPlatformBalances] = useState<Map<string, bigint>>(new Map())
  const [selectedPlatformAddress, setSelectedPlatformAddress] = useState<string | null>(null)
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null)
  const [identityBalances, setIdentityBalances] = useState<Map<string, bigint>>(new Map())
  const [identityBalancesLoading, setIdentityBalancesLoading] = useState(false)
  const senderIdentity = selectedIdentity ?? currentIdentity

  // Wallet type of the current wallet (platform transfers are seedphrase-only).
  const walletType = useMemo((): string | null => {
    if (currentWallet == null || allWallets == null) return null
    return allWallets.find(wallet => wallet.walletId === currentWallet)?.type ?? null
  }, [allWallets, currentWallet])

  // The new sender-selection flow is only offered for seedphrase wallets that
  // have already initialized (created) platform addresses.
  const platformFlowEnabled = walletType === WalletType.seedphrase && platformAddresses.length > 0

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

  // Fiat equivalent for an arbitrary credits balance (per-option in the sender
  // selector), mirroring calculations.getBalanceUSDValue for the selected one.
  const creditsToUsd = (credits: bigint | null | undefined): string | null => {
    if (rate == null || credits == null) return null
    const dashAmount = Number(creditsToDashBigInt(credits))
    return `~ $${(dashAmount * rate).toFixed(3)}`
  }

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

  // Load the wallet's platform addresses (seedphrase only) and their balances.
  useEffect(() => {
    if (walletType !== WalletType.seedphrase) {
      setPlatformAddresses([])
      setPlatformBalances(new Map())
      return
    }

    let cancelled = false

    const loadPlatformAddresses = async (): Promise<void> => {
      const addresses = await extensionAPI.listPlatformAddresses()
      if (cancelled) return
      setPlatformAddresses(addresses)

      if (addresses.length === 0) return

      try {
        const infos = await extensionAPI.getPlatformAddressesInfos(addresses.map(entry => entry.address))
        if (cancelled) return
        setPlatformBalances(new Map(infos.map(info => [info.address, BigInt(info.balance)])))
      } catch (err) {
        console.log('Failed to load platform address balances:', err)
      }
    }

    void loadPlatformAddresses().catch(e => console.log('loadPlatformAddresses error:', e))

    return () => {
      cancelled = true
    }
  }, [walletType, currentWallet, extensionAPI])

  // Load balances for all wallet identities, shown in the sender identity selector.
  // Only needed for the platform flow, where that selector appears.
  useEffect(() => {
    if (!platformFlowEnabled || availableIdentities.length === 0) return

    let cancelled = false
    const ids = availableIdentities.map(identity => identity.identifier)

    const loadIdentityBalances = async (): Promise<void> => {
      setIdentityBalancesLoading(true)
      const entries = await Promise.all(ids.map(async (id): Promise<[string, bigint] | null> => {
        try {
          return [id, await sdk.identities.getIdentityBalance(id)]
        } catch {
          return null
        }
      }))
      if (cancelled) return
      setIdentityBalances(new Map(entries.filter((entry): entry is [string, bigint] => entry != null)))
      setIdentityBalancesLoading(false)
    }

    void loadIdentityBalances().catch(e => console.log('loadIdentityBalances error:', e))

    return () => {
      cancelled = true
    }
  }, [platformFlowEnabled, availableIdentities, sdk])

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

  // Amount clamping when sender changes
  //
  // When the identity balance changes (async, after selectedIdentity changes)
  // or when the sender type / platform address changes (sync), we clamp the
  // current amount to the new available balance.  If the amount fits → keep it.
  // If it exceeds the new max → pull it down to the new max.

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

  const handleSend = async (): Promise<void> => {
    if ((currentIdentity === null || currentIdentity === undefined)) {
      formState.setError('No identity selected')
      return
    }

    const sender = selectedIdentity ?? currentIdentity

    // Validate that recipient is selected from search results
    if (formState.selectedRecipient === null) {
      formState.setError('Please select a recipient from search results')
      return
    }

    if (isSameParty) {
      formState.setError('Recipient must be different from the sender')
      return
    }

    // Platform-address transfers sign and broadcast directly (with a password),
    // so they go through a dedicated confirmation screen instead of /approve.
    if (transferMode === 'fund' || transferMode === 'send' || transferMode === 'topup') {
      const amountCredits = BigInt(Math.floor(Number(formState.formData.amount)))

      if (amountCredits < MIN_OUTPUT_CREDITS) {
        formState.setError(`Minimum platform transfer amount is ${MIN_OUTPUT_CREDITS.toLocaleString()} credits`)
        return
      }

      const spendsFromAddress = transferMode === 'send' || transferMode === 'topup'
      if (spendsFromAddress && selectedPlatformAddress === null) {
        formState.setError('Please select a source platform address')
        return
      }

      void navigate('/platform-transfer-confirm', {
        state: {
          direction: transferMode,
          toAddress: formState.selectedRecipient.identifier,
          fromAddress: spendsFromAddress ? selectedPlatformAddress : undefined,
          amountCredits: amountCredits.toString(),
          fromIdentity: transferMode === 'fund' ? sender : undefined
        }
      })
      return
    }

    setIsLoading(true)
    formState.setError(null)

    try {
      if (transferMode === 'creditTransfer') {
        const amountInCredits = BigInt(Math.floor(Number(formState.formData.amount)))

        // Validate minimum credit transfer amount
        if (amountInCredits < MIN_CREDIT_TRANSFER) {
          formState.setError(`Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`)
          return
        }

        const identityNonce = await sdk.identities.getIdentityNonce(sender)

        // Create unsigned identity credit transfer state transition
        const stateTransition = sdk.identities.createStateTransition('creditTransfer', {
          identityId: sender,
          amount: amountInCredits,
          recipientId: formState.selectedRecipient.identifier,
          identityNonce: identityNonce + 1n
        })

        // Convert to base64
        const stateTransitionBytes = stateTransition.bytes()
        const stateTransitionBase64 = base64.encode(stateTransitionBytes)

        // Create the state transition
        const response = await extensionAPI.createStateTransition(stateTransitionBase64)

        void navigate(`/approve/${response.stateTransition.unsignedHash}`, {
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
        void navigate(`/approve/${response.stateTransition.unsignedHash}`, {
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
      <div className='screen-content'>
        <div className='flex flex-col gap-6'>
          <div className='flex flex-col gap-2'>
            <Text className='text-dash-primary-dark-blue !text-[2.5rem] !font-medium !leading-[1.25] tracking-[-0.03em]'>
              Transfer
            </Text>
            <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>
              What do you want to send?
            </Text>
          </div>

          <div className='flex flex-col gap-2.5'>
            {assetOptions.map((option) => (
              <AssetOptionCard
                key={option.value}
                variant='plain'
                icon={option.icon}
                label={option.label}
                symbol={option.symbol}
                balance={formatAssetBalance(option, balance != null ? balance.toString() : undefined)}
                onClick={() => {
                  formState.handleAssetSelect(option.value)
                  setAssetChosen(true)
                }}
              />
            ))}
          </div>
        </div>
      </div>
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
        <div className='flex flex-col gap-2.5'>
          <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>
            Sender
          </Text>

          {/* Sender type selection */}
          <div className='flex gap-2'>
            {([
              { id: 'identity', label: 'Identity' },
              { id: 'platform', label: 'Platform address' }
            ] as Array<{ id: SenderType, label: string }>).map(option => (
              <SelectableCard
                key={option.id}
                selected={senderType === option.id}
                onClick={() => setSenderType(option.id)}
                boldLabel={option.label}
                className='flex-1'
              />
            ))}
          </div>

          {/* Sender detail */}
          {senderType === 'identity'
            ? (
              <IdentitySelect
                identities={availableIdentities
                  .map(identity => identity.identifier)
                  .filter(identifier => identifier !== recipientIdentity)}
                value={senderIdentity}
                onChange={setSelectedIdentity}
                renderOption={(identifier) => {
                  const bal = identityBalances.get(identifier)
                  const usd = creditsToUsd(bal)
                  return (
                    <div data-fit-trigger-width className='flex items-center gap-2 min-w-0' style={{ width: 'calc(var(--radix-select-trigger-width) - 3.125rem)' }}>
                      <div className='w-8 h-8 shrink-0'>
                        <Avatar username={identifier} />
                      </div>
                      <div className='flex flex-col gap-1 min-w-0'>
                        <Identifier linesAdjustment={false} highlight='both' disableCopy className='!text-[0.813rem]'>
                          {identifier}
                        </Identifier>
                        <div className='flex items-center gap-2'>
                          <div className='flex items-baseline gap-1'>
                            <Text weight='bold' className='!text-[1rem]'>
                              {identityBalancesLoading
                                ? 'Loading…'
                                : bal != null ? bal.toLocaleString() : '—'}
                            </Text>
                            {bal != null && <Text className='!text-[0.75rem]' dim>Credits</Text>}
                          </div>
                          {usd != null && (
                            <ValueCard border={false} size='xs' className='px-[0.313rem] py-[0.156rem]' colorScheme='lightGray'>
                              <Text size='xs' weight='light' className='text-dash-primary-dark-blue !text-[0.625rem] !leading-[1.2]'>
                                {usd}
                              </Text>
                            </ValueCard>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              )
            : (
              <Select
                size='xl'
                value={selectedPlatformAddress ?? undefined}
                onChange={setSelectedPlatformAddress}
                placeholder='Select a platform address'
                options={platformAddresses.map(entry => {
                  const bal = platformBalances.get(entry.address)
                  return {
                    value: entry.address,
                    label: entry.address,
                    content: (
                      <div data-fit-trigger-width className='flex flex-col gap-1 min-w-0' style={{ width: 'calc(var(--radix-select-trigger-width) - 3.125rem)' }}>
                        <Identifier linesAdjustment={false} highlight='both' disableCopy className='!text-[0.813rem]'>
                          {entry.address}
                        </Identifier>
                        <div className='flex items-baseline gap-1'>
                          {bal != null
                            ? <Text weight='bold' className='!text-[0.8125rem]'>{bal.toLocaleString()}</Text>
                            : <Text className='!text-[0.75rem]' dim>Loading balance…</Text>}
                          {bal != null && <Text className='!text-[0.625rem]' dim>Credits</Text>}
                        </div>
                      </div>
                    )
                  }
                })}
              />
              )}
        </div>
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
