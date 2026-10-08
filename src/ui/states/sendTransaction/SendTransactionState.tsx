import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { withAccessControl } from '../../components/auth/withAccessControl'
import ScreenLoader from '../../components/layout/screens/ScreenLoader'
import { AssetSelectionMenu } from '../../components/controls'
import { useCoreBalance, usePlatformAddresses, useWalletCapabilities, useWalletPlatformData } from '../../hooks'
import { locationReturnPath } from '../../types'
import type { OutletContext } from '../../types'
import { parseSendScope } from '../../utils/sendPath'
import { checkRecipients, formatDashAmount, parseDashAmount, summarizeCoinControl, transferAmountLimits, validateTransferAmount } from '../../../utils'
import type { TransferCapabilities } from '../../../utils'
import type { AddressData } from '../../components/addresses/types'
import { resolveEntryDefaults } from './entry/resolveEntryDefaults'
import type { EntryDefaults } from './entry/resolveEntryDefaults'
import { maxPlatformInputs, resolveDirection, runsOnMock } from './directions/resolveDirection'
import { useTransferDraft } from './hooks/useTransferDraft'
import { useSendScreenData } from './hooks/useSendScreenData'
import { useShieldedBalance } from './hooks/useShieldedBalance'
import { useSourceBalance } from './hooks/useSourceBalance'
import { shieldedMaxAmount, useTransferFee } from './hooks/useTransferFee'
import { useTransferSubmit } from './hooks/useTransferSubmit'
import type { ResumedTransfer } from './hooks/useTransferOperation'
import { useTransferOperation } from './hooks/useTransferOperation'
import { useIdentityHeader } from './hooks/useIdentityHeader'
import { useTransferApi } from './transferApi'
import { WizardHeader } from './components/WizardHeader'
import { MAX_RECIPIENTS, COIN_CONTROL_AMOUNT_HINT, CORE_MAX_FEE_RESERVE_DUFFS, CORE_TOP_UP_OWN_IDENTITY_MESSAGE, SAME_PARTY_MESSAGE } from './constants'
import { MIN_FEE_RELAY, TRANSFER_FEE_CREDITS } from '../../../constants'
import { FromToStep } from './steps/FromToStep/FromToStep'
import { isShieldToMyself } from './steps/FromToStep/RecipientRow'
import { AmountStep } from './steps/AmountStep'
import { ConfirmStep } from './steps/ConfirmStep'
import { ProgressStep } from './steps/ProgressStep'
import { ResultStep } from './steps/ResultStep'
import { CoinControlOverlay } from './overlays/CoinControl/CoinControlOverlay'
import { RecipientsOverlay } from './overlays/RecipientsOverlay'
import { AdvancedSummary } from './steps/FromToStep/AdvancedSummary'
import type { TransferOutcome } from './steps/ResultStep'
import type { CoinControlSelection, CoreUtxo, ShieldedNote, SourceIdentity, WizardStep } from './types'

const STEP_INDEX: Record<WizardStep, number> = { fromTo: 0, amount: 1, confirm: 2, progress: 3, result: 3, error: 3 }

const ROUTED_STEPS: WizardStep[] = ['fromTo', 'amount', 'confirm', 'progress', 'result', 'error']

const parseStep = (value: string | null): WizardStep =>
  ROUTED_STEPS.find(step => step === value) ?? 'fromTo'

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
  const [resumed, setResumed] = useState<ResumedTransfer | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [assetMenuOpen, setAssetMenuOpen] = useState(false)
  const [coinControlOpen, setCoinControlOpen] = useState(false)
  const [recipientsOpen, setRecipientsOpen] = useState(false)
  const [changeAddresses, setChangeAddresses] = useState<string[]>([])
  const [utxos, setUtxos] = useState<CoreUtxo[]>([])
  const [notes, setNotes] = useState<ShieldedNote[] | null>(null)

  const identityId = draft.from.type === 'identity' ? draft.from.identityId : null
  const { balance: identityBalance, rate, tokensState } = useSendScreenData({ senderIdentity: identityId, tokensIdentity: identityId, currentNetwork })
  const tokens = useMemo(() => tokensState.data ?? [], [tokensState.data])
  const token = draft.asset.type === 'token' ? tokens.find(item => draft.asset.type === 'token' && item.identifier === draft.asset.tokenId) : undefined
  // Platform Explorer answers faster than DAPI, so it supplies the balances of the identity list.
  const platformData = useWalletPlatformData(availableIdentities, currentNetwork)
  const shieldedBalance = useShieldedBalance()
  const shielded = {
    ...shieldedBalance,
    // Unlocks the shielded balance and loads its notes for Coin Control.
    unlock: async (password: string): Promise<string | null> => {
      const error = await shieldedBalance.unlock(password)
      if (error == null) api.listShieldedNotes(password).then(setNotes).catch(e => { console.log('listShieldedNotes error', e); setNotes([]) })
      return error
    }
  }
  const core = useCoreBalance(currentWallet, capabilities.hasCoreLayer)
  const coreBalance = core.balance != null ? BigInt(core.balance.balance) : null

  const resolution = resolveDirection(draft.from.type, draft.to.type, draft.asset, capabilities)
  const config = resolution.supported ? resolution.config : null

  const balance = useSourceBalance({ draft, identityBalance, coreBalance, platformAddresses, shieldedBalance: shielded.balance, utxos, notes: notes ?? [], token })
  const fee = useTransferFee({ config, draft, network, shieldedSpendEstimates: shielded.spendEstimates })

  const limits = config != null ? transferAmountLimits(config.mode) : null
  const recipientsCheck = checkRecipients(draft.recipients, balance.decimals, limits?.min ?? 1n)
  const advancedAvailable = config?.advanced === true && draft.asset.type === 'dash'
  const amount = draft.isAdvanced ? recipientsCheck.total : parseDashAmount(draft.amount, balance.decimals)
  const isDash = draft.asset.type === 'dash'
  const feeReserve = draft.from.type === 'core' && draft.coinControl.type === 'automatic' ? CORE_MAX_FEE_RESERVE_DUFFS : 0n
  const shieldedMax = shieldedMaxAmount(config, draft, shielded.spendEstimates)
  const maxAmount = shieldedMax ?? (balance.amount == null ? null : isDash && fee != null && fee.decimals === balance.decimals ? balance.amount - fee.amount - feeReserve : balance.amount)
  const amountError = limits != null ? validateTransferAmount(amount, maxAmount, draft.isAdvanced ? { min: 1n, max: null } : limits, balance.decimals, balance.unit) : null

  const stageCount = config?.stages.length ?? 0
  const operation = useTransferOperation(api, stageCount)
  const { isChecking, submit } = useTransferSubmit({ api, mode: config?.mode ?? null, draft, amount, sourceAddress: balance.sourceAddress, walletId: currentWallet, network, track: operation.track })
  const operationState = operation.state
  const outcome: TransferOutcome | null = operationState.status === 'success'
    ? { type: 'success', hashes: operationState.hashes, fee: operationState.fee }
    : operationState.status === 'failed' ? { type: 'error', message: operationState.error } : null

  useIdentityHeader({ currentIdentity, currentWallet, allWallets, currentNetwork, setHeaderComponent })

  const senderIdentifier = draft.from.type === 'identity' ? draft.from.identityId : balance.sourceAddress
  const pickedAddresses = draft.coinControl.type === 'platformInputs' ? draft.coinControl.inputs.map(input => input.address) : []
  const isSender = (address: string): boolean => address !== '' && (address === senderIdentifier || pickedAddresses.includes(address))
  const isSameParty = draft.isAdvanced ? draft.recipients.some(recipient => isSender(recipient.address)) : isSender(draft.to.recipient)
  const inputsTotal = draft.coinControl.type === 'platformInputs' ? summarizeCoinControl(draft.coinControl, [], []).total : null
  const inputsMismatch = draft.isAdvanced && inputsTotal != null && recipientsCheck.total !== inputsTotal
  const advancedError = !draft.isAdvanced
    ? null
    : isSameParty
      ? SAME_PARTY_MESSAGE
      : inputsMismatch && inputsTotal != null
        ? `Recipients must receive exactly the ${formatDashAmount(inputsTotal, balance.decimals)} Dash selected in Coin Control.`
        : recipientsCheck.isValid ? amountError : null
  const isForeignTopUp = config?.mode === 'coreTopUp' && draft.to.recipient !== '' && !availableIdentities.some(identity => identity.identifier === draft.to.recipient)
  const recipientError = draft.isAdvanced ? null : isSameParty ? SAME_PARTY_MESSAGE : isForeignTopUp ? CORE_TOP_UP_OWN_IDENTITY_MESSAGE : null
  const received = amount != null && (config?.mode === 'coreTopUp' || config?.mode === 'coreFund' || config?.mode === 'coreShield') ? amount - MIN_FEE_RELAY : null
  const shieldedReady = draft.from.type !== 'shielded' || (shielded.balance != null && !shielded.isWarmingProver)
  const fromToValid = config != null &&
    (draft.asset.type === 'dash' || token != null) &&
    (draft.from.type !== 'identity' || draft.from.identityId != null) &&
    (draft.isAdvanced ? recipientsCheck.isValid && advancedError == null && draft.changeAddress !== '' : isShieldToMyself(draft) || draft.to.recipient !== '') &&
    (draft.isAdvanced || recipientError == null) &&
    shieldedReady
  const amountValid = fromToValid && balance.amount != null && amount != null && amount > 0n && amountError == null

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

  // Reloads the wallet UTXOs for Coin Control whenever Core is picked or the screen opens.
  useEffect(() => {
    if (draft.from.type !== 'core') return
    api.listCoreUtxos().then(setUtxos).catch(e => console.log('listCoreUtxos error', e))
  }, [api, draft.from.type, coinControlOpen])

  // Falls back to Simple once the direction or asset has no multi-output transfer.
  useEffect(() => {
    if (draft.isAdvanced && !advancedAvailable) actions.setAdvanced(false)
  }, [draft.isAdvanced, advancedAvailable, actions])

  // Loads the wallet Core addresses offered as a custom change address.
  useEffect(() => {
    if (!draft.isAdvanced || draft.from.type !== 'core') return
    api.listCoreAddresses().then(setChangeAddresses).catch(e => console.log('listCoreAddresses error', e))
  }, [api, draft.isAdvanced, draft.from.type, currentWallet, network])

  // Drops a multi-address pick once the direction can spend from one address only.
  useEffect(() => {
    if (config != null && draft.coinControl.type === 'platformInputs' && draft.coinControl.inputs.length > maxPlatformInputs(config)) {
      actions.setCoinControl({ type: 'automatic' })
    }
  }, [config, draft.coinControl, actions])

  const coinControlType = config?.coinControl ?? null
  const coinControlCount = summarizeCoinControl(draft.coinControl, utxos, notes ?? []).count
  const coinControlReady = coinControlType != null && (draft.from.type !== 'shielded' || notes != null)

  const handleCoinControlApply = (selection: CoinControlSelection): void => {
    const inputsTotal = selection.type === 'platformInputs' ? selection.inputs.reduce((sum, input) => sum + BigInt(input.amount), 0n) : null
    actions.setCoinControl(selection, inputsTotal != null ? formatDashAmount(inputsTotal, balance.decimals) : undefined)
    setCoinControlOpen(false)
  }

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
  const settledStatus = operationState.status === 'success' || operationState.status === 'failed' ? operationState.status : null
  useEffect(() => {
    if (settledStatus != null && (step === 'confirm' || step === 'progress')) goToStep(settledStatus === 'success' ? 'result' : 'error', true)
  }, [settledStatus, step])

  // Forgets a pending Retry once the draft changes, so it never resumes a different transfer.
  useEffect(() => { setResumed(null) }, [draft])

  // Hides the header back button while the transfer runs and on the final screens.
  const isFinal = step === 'result' || step === 'error'
  const hideBack = isFinal || step === 'progress'
  useEffect(() => {
    if (!hideBack) return
    setHeaderConfigOverride({ hideLeftSection: true })
    return () => setHeaderConfigOverride(null)
  }, [hideBack, setHeaderConfigOverride])

  const handleConfirm = (password: string): void => {
    submit(password, resumed)
      .then(result => {
        if (result === 'invalidPassword') {
          setPasswordError('Invalid password')
          return
        }
        if (result === 'started' && stageCount > 1) goToStep('progress', true)
      })
      .catch(e => console.log('submit error', e))
  }

  const handleRetry = (): void => {
    const failed = operationState.status === 'failed' ? operationState : null
    setResumed(failed?.resume != null ? { resume: failed.resume, stages: failed.stages } : null)
    operation.reset()
    goToStep('confirm', true)
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
          coinControlLabel={draft.coinControl.type === 'automatic' ? 'Automatic' : `${coinControlCount} selected`}
          onOpenCoinControl={coinControlReady ? () => setCoinControlOpen(true) : null}
          recipientsLabel={`(${draft.recipients.length}/${MAX_RECIPIENTS})`}
          onOpenRecipients={() => setRecipientsOpen(true)}
          advancedSummary={<AdvancedSummary fromType={draft.from.type} balance={balance} recipientsTotal={recipientsCheck.total} fee={fee} rate={rate} error={advancedError} />}
          onNext={() => goToStep(draft.isAdvanced ? 'confirm' : 'amount')}
        />
      )}

      {step === 'progress' && config != null && operationState.status !== 'idle' && (
        <ProgressStep
          labels={config.stages}
          stages={operationState.stages}
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
          lockedHint={draft.coinControl.type === 'platformInputs' ? COIN_CONTROL_AMOUNT_HINT : undefined}
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
          isMock={runsOnMock(config, draft.coinControl, draft.isAdvanced)}
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
          onRetry={handleRetry}
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
          available={maxAmount}
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

      {coinControlType != null && config != null && (
        <CoinControlOverlay
          isOpen={coinControlOpen}
          coinControlType={coinControlType}
          selection={draft.coinControl}
          decimals={balance.decimals}
          utxos={utxos}
          addresses={platformAddresses}
          notes={notes ?? []}
          maxInputs={maxPlatformInputs(config)}
          platformFee={fee != null && fee.decimals === balance.decimals ? fee.amount : TRANSFER_FEE_CREDITS}
          rate={rate}
          onClose={() => setCoinControlOpen(false)}
          onApply={handleCoinControlApply}
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
