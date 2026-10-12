import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { withAccessControl } from '../../components/auth/withAccessControl'
import ScreenLoader from '../../components/layout/screens/ScreenLoader'
import { AssetSelectionMenu } from '../../components/controls'
import { useCoreBalance, usePlatformAddresses, useWalletCapabilities, useWalletPlatformData } from '../../hooks'
import { locationReturnPath } from '../../types'
import type { OutletContext } from '../../types'
import { parseSendScope } from '../../utils/sendPath'
import { checkRecipients, CORE_DASH_DECIMALS, findUnfinishedTopUp, formatDashAmount, hasPendingShield, parseDashAmount, transferAmountLimits, unfinishedTopUps, validateTransferAmount } from '../../../utils'
import type { TransferCapabilities, UnfinishedTopUp } from '../../../utils'
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
import type { TransferResume } from './hooks/useTransferOperation'
import { useTransferOperation } from './hooks/useTransferOperation'
import { useCoreTransferEstimate } from './hooks/useCoreTransferEstimate'
import { useIdentityHeader } from './hooks/useIdentityHeader'
import { useTransferApi } from './transferApi'
import { WizardHeader } from './components/WizardHeader'
import { UnfinishedTopUpBanners } from './components/UnfinishedTopUpBanners'
import { MAX_RECIPIENTS, SAME_PARTY_MESSAGE, SHIELD_NOT_RESUMABLE_MESSAGE } from './constants'
import { MIN_FEE_RELAY } from '../../../constants'
import { FromToStep } from './steps/FromToStep/FromToStep'
import { isShieldToMyself } from './steps/FromToStep/RecipientRow'
import { AmountStep } from './steps/AmountStep'
import { ConfirmStep } from './steps/ConfirmStep'
import { ProgressStep } from './steps/ProgressStep'
import { ResultStep } from './steps/ResultStep'
import { RecipientsOverlay } from './overlays/RecipientsOverlay'
import { AdvancedSummary } from './steps/FromToStep/AdvancedSummary'
import type { TransferOutcome } from './steps/ResultStep'
import type { SourceIdentity, TransferDraft, WizardStep } from './types'

const STEP_INDEX: Record<WizardStep, number> = { fromTo: 0, amount: 1, confirm: 2, progress: 3, result: 3, error: 3 }

const ROUTED_STEPS: WizardStep[] = ['fromTo', 'amount', 'confirm', 'progress', 'result', 'error']

const parseStep = (value: string | null): WizardStep =>
  ROUTED_STEPS.find(step => step === value) ?? 'fromTo'

// Retry that continues a transfer, valid only while the draft it was made for is current.
interface PendingRetry {
  draft: TransferDraft
  resume: TransferResume
}

interface SendWizardProps {
  entry: EntryDefaults
  capabilities: TransferCapabilities
  platformAddresses: AddressData[]
}

function SendWizard ({ entry, capabilities, platformAddresses }: SendWizardProps): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentNetwork, currentWallet, currentIdentity, allWallets, availableIdentities, setHeaderComponent, setHeaderConfigOverride } = useOutletContext<OutletContext>()
  const network = currentNetwork ?? 'testnet'
  const api = useTransferApi()
  const returnPath = useRef(locationReturnPath(location.state, '/')).current

  const { draft, actions } = useTransferDraft(entry.draft, capabilities)
  const [retry, setRetry] = useState<PendingRetry | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [assetMenuOpen, setAssetMenuOpen] = useState(false)
  const [recipientsOpen, setRecipientsOpen] = useState(false)
  const [changeAddresses, setChangeAddresses] = useState<string[]>([])
  const [retryBlock, setRetryBlock] = useState<string | null>(null)
  const [pendingTopUps, setPendingTopUps] = useState<UnfinishedTopUp[]>([])

  const identityId = draft.from.type === 'identity' ? draft.from.identityId : null
  const { balance: identityBalance, rate, tokensState } = useSendScreenData({ senderIdentity: identityId, tokensIdentity: identityId, currentNetwork })
  const tokens = useMemo(() => tokensState.data ?? [], [tokensState.data])
  const token = draft.asset.type === 'token' ? tokens.find(item => draft.asset.type === 'token' && item.identifier === draft.asset.tokenId) : undefined
  // Platform Explorer answers faster than DAPI, so it supplies the balances of the identity list.
  const platformData = useWalletPlatformData(availableIdentities, currentNetwork)
  const shielded = useShieldedBalance()
  const core = useCoreBalance(currentWallet, capabilities.hasCoreLayer)
  const coreBalance = core.balance != null ? BigInt(core.balance.available) : null

  const resolution = resolveDirection(draft.from.type, draft.to.type, draft.asset, capabilities)
  const config = resolution.supported ? resolution.config : null

  const balance = useSourceBalance({ draft, identityBalance, coreBalance, platformAddresses, shieldedBalance: shielded.balance, token })

  const limits = config != null ? transferAmountLimits(config.mode) : null
  const recipientsCheck = checkRecipients(draft.recipients, balance.decimals, limits?.min ?? 1n)
  const advancedAvailable = config?.advanced === true && draft.asset.type === 'dash'
  const amount = draft.isAdvanced ? recipientsCheck.total : parseDashAmount(draft.amount, balance.decimals)
  const isDash = draft.asset.type === 'dash'
  const coreEstimate = useCoreTransferEstimate({ api, config, draft, amount, recipientsValid: recipientsCheck.isValid, balanceKey: core.balance?.available ?? null })
  const fee = useTransferFee({ config, draft, coreFeeDuffs: coreEstimate.feeDuffs, network, shieldedSpendEstimates: shielded.spendEstimates })
  const knownMax = shieldedMaxAmount(config, shielded.spendEstimates) ?? coreMaxAmount(config, recipientCount(draft), coreEstimate.maxSendableDuffs)
  const maxAmount = knownMax ?? (balance.amount == null ? null : isDash && fee != null && fee.decimals === balance.decimals ? balance.amount - fee.amount : balance.amount)
  const amountError = limits != null ? validateTransferAmount(amount, maxAmount, draft.isAdvanced ? { min: 1n, max: null } : limits, balance.decimals, balance.unit) : null

  const resume = retry != null && retry.draft === draft ? retry.resume : null
  const isResumingFunding = resume != null

  const operation = useTransferOperation()
  const { isChecking, submit } = useTransferSubmit({ api, mode: config?.mode ?? null, draft, amount, sourceAddress: balance.sourceAddress, walletId: currentWallet, network, track: operation.track })
  const operationState = operation.state
  const outcome: TransferOutcome | null = operationState.status === 'success'
    ? { type: 'success', hashes: operationState.hashes, fee: operationState.fee, prepaid: operationState.prepaid }
    : operationState.status === 'failed' ? { type: 'error', message: retryBlock ?? operationState.error } : null

  useIdentityHeader({ currentIdentity, currentWallet, allWallets, currentNetwork, setHeaderComponent })

  const senderIdentifier = draft.from.type === 'identity' ? draft.from.identityId : balance.sourceAddress
  const isSender = (address: string): boolean => address !== '' && address === senderIdentifier
  const isSameParty = draft.isAdvanced ? draft.recipients.some(recipient => isSender(recipient.address)) : isSender(draft.to.recipient)
  const advancedError = !draft.isAdvanced
    ? null
    : isSameParty
      ? SAME_PARTY_MESSAGE
      : recipientsCheck.isValid ? amountError : null
  const recipientError = !draft.isAdvanced && isSameParty ? SAME_PARTY_MESSAGE : null
  const received = amount != null && (config?.mode === 'coreTopUp' || config?.mode === 'coreFund' || config?.mode === 'coreShield') ? amount - MIN_FEE_RELAY : null
  const shieldedReady = draft.from.type !== 'shielded' || (shielded.balance != null && !shielded.isWarmingProver)
  const fromToValid = config != null &&
    (draft.asset.type === 'dash' || token != null) &&
    (draft.from.type !== 'identity' || draft.from.identityId != null) &&
    (draft.isAdvanced ? recipientsCheck.isValid && advancedError == null && draft.changeAddress !== '' : isShieldToMyself(draft) || draft.to.recipient !== '') &&
    (draft.isAdvanced || recipientError == null) &&
    shieldedReady
  // A paid top up is resumed without spending the balance again.
  const amountValid = fromToValid && amount != null && amount > 0n && (isResumingFunding || (balance.amount != null && amountError == null))

  const requestedStep = parseStep(searchParams.get('step'))
  const step: WizardStep =
    ((requestedStep === 'result' || requestedStep === 'error') && outcome == null) || (requestedStep === 'progress' && operationState.status === 'idle')
      ? 'fromTo'
      : (requestedStep === 'amount' && (!fromToValid || draft.isAdvanced)) || (requestedStep === 'confirm' && !amountValid)
          ? 'fromTo'
          : requestedStep

  const goToStep = (next: WizardStep, replace = false): void => {
    const params = new URLSearchParams(searchParams)
    params.set('step', next)
    setSearchParams(params, { replace, state: location.state })
  }

  const settledStatus = operationState.status === 'success' || operationState.status === 'failed' ? operationState.status : null

  // Loads unfinished top ups for a Core sender and refreshes its balance once a transfer settles.
  useEffect(() => {
    if (draft.from.type !== 'core') return
    if (settledStatus != null) core.reload()
    api.listPendingAssetLocks().then(locks => setPendingTopUps(unfinishedTopUps(locks))).catch(e => console.log('listPendingAssetLocks error', e))
  }, [api, draft.from.type, settledStatus, core.reload])

  // Falls back to Simple once the direction or asset has no multi-output transfer.
  useEffect(() => {
    if (draft.isAdvanced && !advancedAvailable) actions.setAdvanced(false)
  }, [draft.isAdvanced, advancedAvailable, actions])

  // Loads the wallet Core addresses offered as a custom change address.
  useEffect(() => {
    if (!draft.isAdvanced || draft.from.type !== 'core') return
    api.listCoreAddresses().then(setChangeAddresses).catch(e => console.log('listCoreAddresses error', e))
  }, [api, draft.isAdvanced, draft.from.type, currentWallet, network])

  // Rewrites a step the draft cannot reach yet back to the first step.
  useEffect(() => {
    if (step !== requestedStep) goToStep(step, true)
  }, [step, requestedStep])

  // Leaves an unknown token for Dash once the identity's tokens are known.
  useEffect(() => {
    const tokensKnown = tokensState.data != null || tokensState.error != null
    if (draft.asset.type === 'token' && tokensKnown && token == null) actions.setAsset({ type: 'dash' })
  }, [draft.asset, tokensState.data, tokensState.error, token, actions])

  // Moves to the result once the tracked transfer settles.
  useEffect(() => {
    if (settledStatus != null && (step === 'confirm' || step === 'progress')) goToStep(settledStatus === 'success' ? 'result' : 'error', true)
  }, [settledStatus, step])

  // Hides the header back button while the transfer runs and on the final screens.
  const isFinal = step === 'result' || step === 'error'
  const hideBack = isFinal || step === 'progress'
  useEffect(() => {
    if (!hideBack) return
    setHeaderConfigOverride({ hideLeftSection: true })
    return () => setHeaderConfigOverride(null)
  }, [hideBack, setHeaderConfigOverride])

  const handleConfirm = (password: string): void => {
    submit(password, resume)
      .then(result => {
        if (result === 'invalidPassword') {
          setPasswordError('Invalid password')
          return
        }
        if (result === 'started' && config?.hasProgress === true) goToStep('progress', true)
      })
      .catch(e => console.log('submit error', e))
  }

  // Fills the draft from an unfinished top up and opens Confirm to finish it with the same payment.
  const resumeTopUp = (topUp: UnfinishedTopUp, replace = false): void => {
    const toType = topUp.purpose === 'topUp' ? 'identity' : 'platformAddress'
    const next: TransferDraft = {
      ...draft,
      from: { ...draft.from, type: 'core' },
      to: { ...draft.to, type: toType, recipient: topUp.recipient },
      asset: { type: 'dash' },
      amount: formatDashAmount(topUp.lockedDuffs + MIN_FEE_RELAY, CORE_DASH_DECIMALS),
      isAdvanced: false,
      recipients: [],
      changeAddress: null
    }
    actions.reset(next)
    setRetry({ draft: next, resume: { address: topUp.fundingAddress, txid: topUp.fundingTxid } })
    setRetryBlock(null)
    goToStep('confirm', replace)
  }

  const repeatTransfer = (): void => {
    setRetry(null)
    setRetryBlock(null)
    operation.reset()
    goToStep('confirm', true)
  }

  // Retry of a Core -> Platform transfer finishes a paid asset lock instead of paying again; a paid shielding is not repeated.
  const handleRetry = (): void => {
    const mode = config?.mode
    if (mode !== 'coreTopUp' && mode !== 'coreFund' && mode !== 'coreShield') {
      repeatTransfer()
      return
    }

    api.listPendingAssetLocks()
      .then(locks => {
        const topUps = unfinishedTopUps(locks)
        setPendingTopUps(topUps)

        if (mode === 'coreShield') {
          if (hasPendingShield(locks)) setRetryBlock(SHIELD_NOT_RESUMABLE_MESSAGE)
          else repeatTransfer()
          return
        }

        const purpose = mode === 'coreTopUp' ? 'topUp' : 'fundAddress'
        const topUp = findUnfinishedTopUp(topUps, purpose, draft.to.recipient, amount != null ? amount - MIN_FEE_RELAY : null)
        if (topUp == null) {
          repeatTransfer()
          return
        }
        operation.reset()
        resumeTopUp(topUp, true)
      })
      .catch(e => setRetryBlock(e instanceof Error ? e.message : String(e)))
  }

  const identities = availableIdentities.map((identity): SourceIdentity => {
    const credits = platformData.identities.find(item => item.identifier === identity.identifier)?.credits
    return { identifier: identity.identifier, balance: credits != null ? BigInt(credits) : null }
  })

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
          canContinue={fromToValid}
          recipientError={recipientError}
          onOpenAsset={() => setAssetMenuOpen(true)}
          unfinishedTopUps={draft.from.type === 'core' && <UnfinishedTopUpBanners topUps={pendingTopUps} onRetry={(topUp) => resumeTopUp(topUp)} />}
          recipientsLabel={`(${draft.recipients.length}/${MAX_RECIPIENTS})`}
          onOpenRecipients={() => setRecipientsOpen(true)}
          advancedSummary={<AdvancedSummary fromType={draft.from.type} balance={balance} recipientsTotal={recipientsCheck.total} fee={fee} rate={rate} error={advancedError} />}
          onNext={() => goToStep(draft.isAdvanced ? 'confirm' : 'amount')}
        />
      )}

      {step === 'progress' && operationState.status !== 'idle' && (
        <ProgressStep
          isRunning={operationState.status === 'running'}
          onClose={() => { void navigate(returnPath, { replace: true }) }}
        />
      )}

      {step === 'amount' && (
        <AmountStep
          draft={draft}
          balance={balance}
          maxAmount={maxAmount}
          amountError={amountError}
          rate={rate}
          onAmountChange={(value) => actions.setAmount(value)}
          onNext={() => goToStep('confirm')}
        />
      )}

      {step === 'confirm' && config != null && amount != null && (
        <ConfirmStep
          draft={draft}
          config={config}
          amount={amount}
          balance={balance}
          fee={fee}
          received={received}
          isPrepaid={isResumingFunding}
          rate={rate}
          isSubmitting={isChecking || operationState.status === 'running'}
          passwordError={passwordError}
          onPasswordChange={() => setPasswordError(null)}
          onConfirm={handleConfirm}
        />
      )}

      {isFinal && outcome != null && config != null && amount != null && (
        <ResultStep
          outcome={outcome}
          draft={draft}
          config={config}
          amount={amount}
          balance={balance}
          fee={fee}
          received={received}
          rate={rate}
          network={network}
          onDone={() => { void navigate(returnPath, { replace: true }) }}
          isPrepaid={isResumingFunding}
          onRetry={retryBlock == null ? handleRetry : undefined}
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
          availableFor={(count) => coreMaxAmount(config, count, coreEstimate.maxSendableDuffs) ?? maxAmount}
          minAmount={limits.min}
          excludeIdentifier={balance.sourceAddress}
          network={network}
          onClose={() => setRecipientsOpen(false)}
          onApply={(recipients, changeAddress) => {
            actions.setRecipients(recipients)
            actions.setChangeAddress(changeAddress)
            setRecipientsOpen(false)
          }}
        />
      )}

      <AssetSelectionMenu
        isOpen={assetMenuOpen}
        onClose={() => setAssetMenuOpen(false)}
        selectedAsset={draft.asset.type === 'token' ? draft.asset.tokenId : 'credits'}
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
