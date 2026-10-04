import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { withAccessControl } from '../../components/auth/withAccessControl'
import ScreenLoader from '../../components/layout/screens/ScreenLoader'
import { AssetSelectionMenu } from '../../components/controls'
import { usePlatformAddresses, useWalletCapabilities } from '../../hooks'
import { locationReturnPath } from '../../types'
import type { OutletContext } from '../../types'
import { parseSendScope } from '../../utils/sendPath'
import { parseDashAmount, transferAmountLimits, validateTransferAmount } from '../../../utils'
import type { TransferCapabilities } from '../../../utils'
import type { AddressData } from '../../components/addresses/types'
import { resolveEntryDefaults } from './entry/resolveEntryDefaults'
import type { EntryDefaults } from './entry/resolveEntryDefaults'
import { resolveDirection } from './directions/resolveDirection'
import { useTransferDraft } from './hooks/useTransferDraft'
import { useSendScreenData } from './hooks/useSendScreenData'
import { useShieldedBalance } from './hooks/useShieldedBalance'
import { useSourceBalance } from './hooks/useSourceBalance'
import { useTransferFee } from './hooks/useTransferFee'
import { useTransferSubmit } from './hooks/useTransferSubmit'
import { useIdentityHeader } from './hooks/useIdentityHeader'
import { useTransferApi } from './transferApi'
import { WizardHeader } from './components/WizardHeader'
import { FromToStep } from './steps/FromToStep/FromToStep'
import { isShieldToMyself } from './steps/FromToStep/RecipientRow'
import { AmountStep } from './steps/AmountStep'
import { ConfirmStep } from './steps/ConfirmStep'
import { ResultStep } from './steps/ResultStep'
import type { TransferOutcome } from './steps/ResultStep'
import type { WizardStep } from './types'

// Core sender directions run on mocks and are enabled in a later stage.
const CORE_SENDER_ENABLED = false

const STEP_INDEX: Record<WizardStep, number> = { fromTo: 0, amount: 1, confirm: 2, progress: 3, result: 3, error: 3 }

const ROUTED_STEPS: WizardStep[] = ['fromTo', 'amount', 'confirm', 'result', 'error']

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
  const [outcome, setOutcome] = useState<TransferOutcome | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [assetMenuOpen, setAssetMenuOpen] = useState(false)

  const identityId = draft.from.type === 'identity' ? draft.from.identityId : null
  const { balance: identityBalance, rate, tokensState } = useSendScreenData({ senderIdentity: identityId, tokensIdentity: identityId, currentNetwork })
  const tokens = useMemo(() => tokensState.data ?? [], [tokensState.data])
  const token = draft.asset.type === 'token' ? tokens.find(item => draft.asset.type === 'token' && item.identifier === draft.asset.tokenId) : undefined
  const shielded = useShieldedBalance()

  const resolution = resolveDirection(draft.from.type, draft.to.type, draft.asset, capabilities)
  const config = resolution.supported ? resolution.config : null

  const balance = useSourceBalance({ draft, identityBalance, platformAddresses, shieldedBalance: shielded.balance, token })
  const feeCredits = useTransferFee({ config, draft, network, shieldedSpendFees: shielded.spendFees })

  const amount = parseDashAmount(draft.amount, balance.decimals)
  const isDash = draft.asset.type === 'dash'
  const maxAmount = balance.amount == null ? null : isDash && feeCredits != null ? balance.amount - feeCredits : balance.amount
  const amountError = config != null ? validateTransferAmount(amount, maxAmount, transferAmountLimits(config.mode), balance.decimals, balance.unit) : null

  const { isSubmitting, submit } = useTransferSubmit({ api, mode: config?.mode ?? null, draft, amount, sourceAddress: balance.sourceAddress, walletId: currentWallet, network })

  useIdentityHeader({ currentIdentity, currentWallet, allWallets, currentNetwork, setHeaderComponent })

  const senderIdentifier = draft.from.type === 'identity' ? draft.from.identityId : balance.sourceAddress
  const isSameParty = draft.to.recipient !== '' && draft.to.recipient === senderIdentifier
  const shieldedReady = draft.from.type !== 'shielded' || (shielded.balance != null && !shielded.isWarmingProver)
  const fromToValid = config != null &&
    (draft.asset.type === 'dash' || token != null) &&
    (draft.from.type !== 'identity' || draft.from.identityId != null) &&
    (isShieldToMyself(draft) || draft.to.recipient !== '') &&
    !isSameParty &&
    shieldedReady
  const amountValid = fromToValid && balance.amount != null && amount != null && amount > 0n && amountError == null

  const requestedStep = parseStep(searchParams.get('step'))
  const step: WizardStep =
    (requestedStep === 'result' || requestedStep === 'error') && outcome == null
      ? 'fromTo'
      : (requestedStep === 'amount' && !fromToValid) || (requestedStep === 'confirm' && !amountValid)
          ? 'fromTo'
          : requestedStep

  const goToStep = (next: WizardStep, replace = false): void => {
    const params = new URLSearchParams(searchParams)
    params.set('step', next)
    setSearchParams(params, { replace, state: location.state })
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

  // Hides the header back button on the final screens.
  const isFinal = step === 'result' || step === 'error'
  useEffect(() => {
    if (!isFinal) return
    setHeaderConfigOverride({ hideLeftSection: true })
    return () => setHeaderConfigOverride(null)
  }, [isFinal, setHeaderConfigOverride])

  const handleConfirm = (password: string): void => {
    submit(password)
      .then(result => {
        if (result.type === 'invalidPassword') {
          setPasswordError('Invalid password')
          return
        }
        setOutcome(result)
        goToStep(result.type === 'success' ? 'result' : 'error', true)
      })
      .catch(e => console.log('submit error', e))
  }

  const identities = availableIdentities.map(identity => identity.identifier)

  return (
    <div className='screen-content'>
      {!isFinal && <WizardHeader activeStep={STEP_INDEX[step]} advancedAvailable={false} />}

      {step === 'fromTo' && (
        <FromToStep
          draft={draft}
          actions={actions}
          resolution={resolution}
          typeOrder={entry.typeOrder}
          capabilities={capabilities}
          coreSenderPending={!CORE_SENDER_ENABLED}
          identities={identities}
          balance={balance}
          rate={rate}
          shielded={shielded}
          tokens={tokens}
          feeCredits={feeCredits}
          network={network}
          canContinue={fromToValid}
          isSameParty={isSameParty}
          onOpenAsset={() => setAssetMenuOpen(true)}
          onNext={() => goToStep('amount')}
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
          feeCredits={feeCredits}
          rate={rate}
          isSubmitting={isSubmitting}
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
          feeCredits={feeCredits}
          rate={rate}
          network={network}
          onDone={() => { void navigate(returnPath, { replace: true }) }}
          onRetry={() => goToStep('confirm', true)}
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

  const ready = walletsLoaded && (!walletCapabilities.hasAddressLayer || platform.hasLoaded || platform.error != null)

  const capabilities = useMemo((): TransferCapabilities => ({
    hasCoreLayer: walletCapabilities.hasCoreLayer && CORE_SENDER_ENABLED,
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
