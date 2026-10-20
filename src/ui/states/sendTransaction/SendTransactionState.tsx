import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { withAccessControl } from '../../components/auth/withAccessControl'
import ScreenLoader from '../../components/layout/screens/ScreenLoader'
import { AssetSelectionMenu } from '../../components/controls'
import { useCoreBalance, usePlatformAddresses, useWalletCapabilities, useWalletPlatformData } from '../../hooks'
import { locationReturnPath } from '../../types'
import type { OutletContext } from '../../types'
import { parseSendScope } from '../../utils/sendPath'
import type { SendContinueState } from '../../utils/sendPath'
import { isUnsendableFundingError, resumedAmounts, transferAmountInput, validateTransfer } from '../../../utils'
import type { TransferCapabilities } from '../../../utils'
import type { AddressData } from '../../components/addresses/types'
import { resolveEntryDefaults } from './entry/resolveEntryDefaults'
import type { EntryDefaults } from './entry/resolveEntryDefaults'
import { resolveDirection } from './directions/resolveDirection'
import { useTransferDraft } from './hooks/useTransferDraft'
import { useSendScreenData } from './hooks/useSendScreenData'
import { useShieldedBalance } from './hooks/useShieldedBalance'
import { useSourceBalance } from './hooks/useSourceBalance'
import { coreMaxAmount, recipientCount, shieldedMaxAmount, useTransferFee } from './hooks/useTransferFee'
import { useTransferSubmit } from './hooks/useTransferSubmit'
import { useTransferOperation } from './hooks/useTransferOperation'
import { useTransferRetry } from './hooks/useTransferRetry'
import { useCoreTransferEstimate } from './hooks/useCoreTransferEstimate'
import { usePlatformFeeEstimate } from './hooks/usePlatformFeeEstimate'
import { useChangeAddresses } from './hooks/useChangeAddresses'
import { useOwnCoreAddress } from './hooks/useOwnCoreAddress'
import { useIdentityHeader } from './hooks/useIdentityHeader'
import { STEP_INDEX, useStepNavigation, useWizardStep } from './hooks/useWizardStep'
import { useTransferApi } from './transferApi'
import { WizardHeader } from './components/WizardHeader'
import { UnfinishedOperationBanners } from './components/UnfinishedOperationBanners'
import { maxRecipients } from './constants'
import { FromToStep } from './steps/FromToStep/FromToStep'
import { AmountStep } from './steps/AmountStep'
import { ConfirmStep } from './steps/ConfirmStep'
import { ProgressStep } from './steps/ProgressStep'
import { ResultStep } from './steps/ResultStep'
import { RecipientsOverlay } from './overlays/RecipientsOverlay'
import { AdvancedSummary } from './steps/FromToStep/AdvancedSummary'
import type { TransferOutcome } from './steps/ResultStep'
import type { SourceIdentity } from './types'

interface SendWizardProps {
  entry: EntryDefaults
  capabilities: TransferCapabilities
  platformAddresses: AddressData[]
}

function SendWizard ({ entry, capabilities, platformAddresses }: SendWizardProps): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentNetwork, currentWallet, currentIdentity, allWallets, availableIdentities, setHeaderComponent, setHeaderConfigOverride } = useOutletContext<OutletContext>()
  const network = currentNetwork ?? 'testnet'
  const api = useTransferApi()
  const returnPath = useRef(locationReturnPath(location.state, '/')).current

  const { draft, actions } = useTransferDraft(entry.draft, capabilities)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [assetMenuOpen, setAssetMenuOpen] = useState(false)
  const [recipientsOpen, setRecipientsOpen] = useState(false)
  // Recipients being edited in the overlay, priced before they are applied.
  const [overlayCount, setOverlayCount] = useState<number | null>(null)

  const identityId = draft.from.type === 'identity' ? draft.from.identityId : null
  const tokenId = draft.asset.type === 'token' ? draft.asset.tokenId : null
  const { balance: identityBalance, rate, tokensState } = useSendScreenData(identityId, network)
  const tokens = useMemo(() => tokensState.data ?? [], [tokensState.data])
  const token = tokenId != null ? tokens.find(item => item.identifier === tokenId) : undefined
  // Platform Explorer answers faster than DAPI, so it supplies the balances of the identity list.
  const platformData = useWalletPlatformData(availableIdentities, currentNetwork)
  const shielded = useShieldedBalance()
  const core = useCoreBalance(currentWallet, capabilities.hasCoreLayer)
  const coreBalance = core.balance != null ? BigInt(core.balance.balance) : null

  const resolution = resolveDirection(draft.from.type, draft.to.type, draft.asset, capabilities)
  const config = resolution.supported ? resolution.config : null
  const mode = config?.mode ?? null
  const advancedAvailable = config?.advanced === true && draft.asset.type === 'dash'

  const balance = useSourceBalance({ draft, identityBalance, coreBalance, platformAddresses, shieldedBalance: shielded.balance, token })
  const input = transferAmountInput(draft, mode, balance.decimals)
  const { limits, recipientsCheck, amount } = input
  const coreEstimate = useCoreTransferEstimate({ api, config, draft, amount, recipientsValid: recipientsCheck.isValid, balance: coreBalance })
  const platformOutputCount = recipientsOpen && overlayCount != null ? overlayCount : recipientCount(draft)
  const platformEstimate = usePlatformFeeEstimate({ api, mode, identityId, sourceAddress: balance.sourceAddress, outputCount: platformOutputCount, balance: balance.amount })
  const fee = useTransferFee({ config, draft, coreEstimate, platformEstimate, network, shieldedSpendEstimates: shielded.spendEstimates })
  const knownMax = shieldedMaxAmount(config, shielded.spendEstimates) ?? coreMaxAmount(config, recipientCount(draft), coreEstimate.maxAmountDuffs) ?? platformEstimate.estimate?.maxAmountCredits ?? null

  const operation = useTransferOperation()
  const operationState = operation.state
  const settledStatus = operationState.status === 'success' || operationState.status === 'failed' ? operationState.status : null
  const navigation = useStepNavigation()
  const { goToStep } = navigation
  const continueTxid = (location.state as SendContinueState | null)?.continueFundingTxid ?? null
  const { resumedOperation, pendingOperations, continueOperation, handleRetry, discard, discardResumed } = useTransferRetry({ api, draft, settledStatus, continueTxid, reloadCoreBalance: core.reload, resetDraft: actions.reset, resetOperation: operation.reset, goToStep })
  const isContinuing = resumedOperation != null
  // An unfinished operation to the same recipient is completed instead of the typed amount.
  const resumed = resumedOperation != null ? resumedAmounts(resumedOperation) : null
  const sentAmount = resumed?.amount ?? amount

  const { isChecking, submit } = useTransferSubmit({ api, mode, draft, amount: sentAmount, sourceAddress: balance.sourceAddress, walletId: currentWallet, network, track: operation.track })

  const validation = validateTransfer({
    draft,
    mode,
    balance,
    assetKnown: draft.asset.type === 'dash' || token != null,
    fee,
    knownMax,
    knownMin: platformEstimate.estimate?.minAmountCredits ?? null,
    input,
    senderIdentifier: draft.from.type === 'identity' ? draft.from.identityId : balance.sourceAddress,
    shieldedReady: draft.from.type !== 'shielded' || (shielded.balance != null && !shielded.isWarmingProver),
    isResumingFunding: isContinuing
  })
  const { maxAmount, amountError, advancedError, recipientError, received, fromToValid, amountValid } = validation
  const step = useWizardStep(navigation, {
    fromToValid,
    amountValid,
    isAdvanced: draft.isAdvanced,
    hasOutcome: settledStatus != null,
    isOperationIdle: operationState.status === 'idle',
    settledStatus
  })

  const outcome: TransferOutcome | null = operationState.status === 'success'
    ? { type: 'success', hashes: operationState.hashes, fee: operationState.fee, continued: operationState.continued, credited: operationState.credited }
    : operationState.status === 'failed' ? { type: 'error', message: operationState.error } : null

  const changeAddresses = useChangeAddresses(api, draft.isAdvanced && draft.from.type === 'core', currentWallet, network)
  const ownCoreAddress = useOwnCoreAddress(api, !draft.isAdvanced && draft.from.type !== 'core' && draft.to.type === 'core' && capabilities.hasCoreLayer, currentWallet, network)

  useIdentityHeader({ currentIdentity, currentWallet, allWallets, currentNetwork, setHeaderComponent })

  // Falls back to Simple once the direction or asset has no multi-output transfer.
  useEffect(() => {
    if (draft.isAdvanced && !advancedAvailable) actions.setAdvanced(false)
  }, [draft.isAdvanced, advancedAvailable, actions])

  // Leaves an unknown token for Dash once the identity's tokens are known.
  useEffect(() => {
    const tokensKnown = tokensState.data != null || tokensState.error != null
    if (draft.asset.type === 'token' && tokensKnown && token == null) actions.setAsset({ type: 'dash' })
  }, [draft.asset, tokensState.data, tokensState.error, token, actions])

  // Hides the header back button while the transfer runs and on the final screens.
  const isFinal = step === 'result' || step === 'error'
  const hideBack = isFinal || step === 'progress'
  useEffect(() => {
    if (!hideBack) return
    setHeaderConfigOverride({ hideLeftSection: true })
    return () => setHeaderConfigOverride(null)
  }, [hideBack, setHeaderConfigOverride])

  const handleConfirm = (password: string): void => {
    submit(password)
      .then(result => {
        if (result === 'invalidPassword') {
          setPasswordError('Invalid password')
          return
        }
        if (result === 'started' && config?.hasProgress === true) goToStep('progress', true)
      })
      .catch(e => console.log('submit error', e))
  }

  const identities = availableIdentities.map((identity): SourceIdentity => {
    const credits = platformData.identities.find(item => item.identifier === identity.identifier)?.credits
    return { identifier: identity.identifier, balance: credits != null ? BigInt(credits) : null }
  })

  const close = (): void => { void navigate(returnPath, { replace: true }) }

  const closeRecipients = (): void => {
    setRecipientsOpen(false)
    setOverlayCount(null)
  }

  // Most `count` Advanced recipients can receive in total; an address transfer is known only for the priced count.
  const availableFor = (count: number): bigint | null => {
    if (mode === 'send') return count === platformOutputCount ? platformEstimate.estimate?.maxAmountCredits ?? null : null
    return coreMaxAmount(config, count, coreEstimate.maxAmountDuffs) ?? maxAmount
  }

  return (
    <div className='screen-content'>
      {!isFinal && <WizardHeader activeStep={STEP_INDEX[step]} isAdvanced={draft.isAdvanced} advancedAvailable={advancedAvailable && step === 'fromTo'} onAdvancedChange={(value) => actions.setAdvanced(value)} />}

      {step === 'fromTo' && (
        <FromToStep
          draft={draft}
          actions={actions}
          resolution={resolution}
          typeOrder={entry.typeOrder}
          capabilities={capabilities}
          identities={identities}
          balance={balance}
          rate={rate}
          shielded={shielded}
          tokens={tokens}
          fee={fee}
          network={network}
          ownCoreAddress={ownCoreAddress}
          ownPlatformAddresses={platformAddresses.map(item => item.address)}
          canContinue={fromToValid}
          recipientError={recipientError}
          onOpenAsset={() => setAssetMenuOpen(true)}
          unfinishedOperations={draft.from.type === 'core' && <UnfinishedOperationBanners operations={pendingOperations} onContinue={continueOperation} />}
          recipientsLabel={`(${draft.recipients.length}/${maxRecipients(draft.from.type)})`}
          onOpenRecipients={() => setRecipientsOpen(true)}
          advancedSummary={<AdvancedSummary fromType={draft.from.type} balance={balance} recipientsTotal={recipientsCheck.total} fee={fee} rate={rate} error={advancedError} />}
          onNext={() => goToStep(draft.isAdvanced ? 'confirm' : 'amount')}
        />
      )}

      {step === 'progress' && operationState.status !== 'idle' && (
        <ProgressStep isRunning={operationState.status === 'running'} onClose={close} />
      )}

      {step === 'amount' && (
        <AmountStep
          draft={draft}
          balance={balance}
          maxAmount={maxAmount}
          amountError={amountError}
          isPrepaid={isContinuing}
          rate={rate}
          canContinue={amountValid}
          onAmountChange={(value) => actions.setAmount(value)}
          onNext={() => goToStep('confirm')}
        />
      )}

      {step === 'confirm' && config != null && sentAmount != null && (
        <ConfirmStep
          draft={draft}
          config={config}
          amount={sentAmount}
          balance={balance}
          fee={fee}
          received={resumed?.received ?? received}
          isPrepaid={isContinuing}
          typedAmount={amount}
          rate={rate}
          isSubmitting={isChecking || operationState.status === 'running'}
          passwordError={passwordError}
          onPasswordChange={() => setPasswordError(null)}
          onConfirm={handleConfirm}
        />
      )}

      {isFinal && outcome != null && config != null && sentAmount != null && (
        <ResultStep
          outcome={outcome}
          draft={draft}
          config={config}
          amount={sentAmount}
          balance={balance}
          fee={fee}
          received={resumed?.received ?? received}
          rate={rate}
          network={network}
          onDone={close}
          isPrepaid={isContinuing}
          onRetry={handleRetry}
          discard={operationState.status === 'failed' && isUnsendableFundingError(operationState.error) && resumedOperation?.fundingAddress != null ? discard : null}
          onDiscard={discardResumed}
        />
      )}

      {advancedAvailable && limits != null && recipientsOpen && (
        <RecipientsOverlay
          isOpen
          isCore={draft.from.type === 'core'}
          recipients={draft.recipients}
          changeAddress={draft.changeAddress}
          changeAddresses={changeAddresses}
          decimals={balance.decimals}
          maxRecipients={maxRecipients(draft.from.type)}
          availableFor={availableFor}
          onCountChange={setOverlayCount}
          minAmount={limits.min}
          rate={rate}
          excludeIdentifier={balance.sourceAddress}
          network={network}
          onClose={closeRecipients}
          onApply={(recipients, changeAddress) => {
            actions.setRecipients(recipients)
            actions.setChangeAddress(changeAddress)
            closeRecipients()
          }}
        />
      )}

      <AssetSelectionMenu
        isOpen={assetMenuOpen}
        onClose={() => setAssetMenuOpen(false)}
        selectedAsset={tokenId ?? 'credits'}
        onAssetSelect={(value) => actions.setAsset(value === 'credits' ? { type: 'dash' } : { type: 'token', tokenId: value })}
        creditsBalance={identityBalance?.toString()}
        tokens={tokens}
      />
    </div>
  )
}

function SendTransactionState (): React.JSX.Element {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { currentNetwork, currentWallet, currentIdentity, walletsLoaded } = useOutletContext<OutletContext>()
  const walletCapabilities = useWalletCapabilities()
  const platform = usePlatformAddresses(currentNetwork, currentWallet ?? undefined)
  const [entry, setEntry] = useState<EntryDefaults | null>(null)

  // Waits for the address list only; balances come from Platform and may take long.
  const addressesKnown = platform.hasLoaded || platform.addresses.length > 0 || platform.error != null
  const ready = walletsLoaded && (!walletCapabilities.hasAddressLayer || addressesKnown)

  const capabilities = useMemo((): TransferCapabilities => ({
    hasCoreLayer: walletCapabilities.hasCoreLayer,
    hasAddressLayer: walletCapabilities.hasAddressLayer,
    hasPlatformAddresses: platform.addresses.length > 0
  }), [walletCapabilities, platform.addresses.length])

  // Builds the initial draft once the wallet capabilities are known.
  useEffect(() => {
    if (!ready || entry != null) return
    const locationState = location.state as { selectedToken?: string } | null
    setEntry(resolveEntryDefaults({
      scope: parseSendScope(searchParams.get('scope')),
      identityId: searchParams.get('identity'),
      selectedToken: locationState?.selectedToken ?? null,
      currentIdentityId: currentIdentity,
      capabilities
    }))
  }, [ready, entry, location.state, searchParams, currentIdentity, capabilities])

  if (entry == null) {
    return (
      <div className='screen-content'>
        <ScreenLoader />
      </div>
    )
  }

  return <SendWizard entry={entry} capabilities={capabilities} platformAddresses={platform.addresses} />
}

export default withAccessControl(SendTransactionState, { requireWallet: true })
