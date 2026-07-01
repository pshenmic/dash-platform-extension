import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom'
import {
  Button,
  Text,
  ValueCard,
  Identifier
} from 'dash-ui-kit/react'
import { base64 } from '@scure/base'
import { AssetSelectionMenu, AssetSelectorBadge, OptionSelector, SelectableCard } from '../../components/controls'
import type { OptionItem } from '../../components/controls'
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
import type { NetworkType, TokenData } from '../../../types'
import type { OutletContext } from '../../types'
import { WalletType } from '../../../types'
import { toBaseUnit } from '../../../utils'
import { MIN_CREDIT_TRANSFER } from '../../constants/transaction'
import { TRANSFER_FEE_CREDITS, MIN_OUTPUT_CREDITS } from '../../../constants'
import {
  getFormattedBalance,
  getAssetLabel,
  getAssetDecimals
} from '../../../utils/transactionFormatters'

// Resolved action, derived from asset + sender type + recipient kind.
type TransferMode = 'creditTransfer' | 'tokenTransfer' | 'fund' | 'send' | 'blocked' | 'incomplete'
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

  // Platform-transfer state
  const [assetChosen, setAssetChosen] = useState(false)
  const [senderType, setSenderType] = useState<SenderType>('identity')
  const [platformAddresses, setPlatformAddresses] = useState<PlatformAddressEntry[]>([])
  const [platformBalances, setPlatformBalances] = useState<Map<string, bigint>>(new Map())
  const [selectedPlatformAddress, setSelectedPlatformAddress] = useState<string | null>(null)
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null)
  const senderIdentity = selectedIdentity ?? currentIdentity

  // Wallet type of the current wallet (platform transfers are seedphrase-only).
  const walletType = useMemo((): string | null => {
    if (currentWallet == null || allWallets == null) return null
    return allWallets.find(wallet => wallet.walletId === currentWallet)?.type ?? null
  }, [allWallets, currentWallet])

  // The new sender-selection flow is only offered for seedphrase wallets that
  // have already initialized (created) platform addresses.
  const platformFlowEnabled = walletType === WalletType.seedphrase && platformAddresses.length > 0

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

  const isCredits = formState.formData.selectedAsset === 'credits'
  const recipientKind = formState.selectedRecipient?.type ?? null

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
      return recipientKind === 'platformAddress' ? 'fund' : 'creditTransfer'
    }
    // senderType === 'platform'
    return recipientKind === 'platformAddress' ? 'send' : 'blocked'
  }, [formState.selectedRecipient, isCredits, senderType, recipientKind])

  const isPlatformMode = transferMode === 'fund' || transferMode === 'send'

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

    if (transferMode === 'blocked') {
      formState.setError('Sending from a platform address to an identity is not supported yet')
      return
    }

    if (isSameParty) {
      formState.setError('Recipient must be different from the sender')
      return
    }

    // Platform-address transfers sign and broadcast directly (with a password),
    // so they go through a dedicated confirmation screen instead of /approve.
    if (transferMode === 'fund' || transferMode === 'send') {
      const amountCredits = BigInt(Math.floor(Number(formState.formData.amount)))

      if (amountCredits < MIN_OUTPUT_CREDITS) {
        formState.setError(`Minimum platform transfer amount is ${MIN_OUTPUT_CREDITS.toLocaleString()} credits`)
        return
      }

      if (transferMode === 'send' && selectedPlatformAddress === null) {
        formState.setError('Please select a source platform address')
        return
      }

      void navigate('/platform-transfer-confirm', {
        state: {
          direction: transferMode,
          toAddress: formState.selectedRecipient.identifier,
          fromAddress: transferMode === 'send' ? selectedPlatformAddress : undefined,
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

  const hasTokens = (tokensState.data?.length ?? 0) > 0

  // Options for the initial "what to send" step (Credits + any tokens).
  const assetOptions: OptionItem[] = useMemo(() => {
    const options: OptionItem[] = [{ id: 'credits', label: 'Credits' }]
    for (const t of tokensState.data ?? []) {
      const name = t.localizations?.en?.singularForm ?? t.identifier
      options.push({ id: t.identifier, label: name })
    }
    return options
  }, [tokensState.data])

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
    transferMode === 'blocked' ||
    isSameParty ||
    (transferMode === 'send' && selectedPlatformAddress === null)

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

          <OptionSelector
            options={assetOptions}
            selectedId={null}
            onOptionSelect={(id) => {
              formState.handleAssetSelect(id)
              setAssetChosen(true)
            }}
          />
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
              <div className='flex flex-col gap-2'>
                <IdentitySelect
                  identities={availableIdentities
                    .map(identity => identity.identifier)
                    .filter(identifier => identifier !== recipientIdentity)}
                  value={senderIdentity}
                  onChange={setSelectedIdentity}
                />
                <div className='flex items-center gap-1 px-1'>
                  <Text className='!text-[0.75rem]' dim>Identity balance:</Text>
                  <Text weight='bold' className='!text-[0.75rem]'>
                    {balance != null ? balance.toLocaleString() : '—'}
                  </Text>
                  <Text className='!text-[0.75rem]'>Credits</Text>
                </div>
              </div>
              )
            : (
              <div className='flex flex-col gap-2'>
                {platformAddresses.map(entry => {
                  const bal = platformBalances.get(entry.address)
                  return (
                    <SelectableCard
                      key={entry.address}
                      selected={selectedPlatformAddress === entry.address}
                      onClick={() => setSelectedPlatformAddress(entry.address)}
                    >
                      <div className='flex flex-col gap-1 min-w-0'>
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
                    </SelectableCard>
                  )
                })}
              </div>
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
      />

      {/* Error Message */}
      <Banner variant='error' message={formState.error ?? null} />
      {transferMode === 'blocked' && (
        <Banner variant='error' message='Sending from a platform address to an identity is not supported yet' />
      )}
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
