import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom'
import { useExtensionAPI, useWalletName } from '../../hooks'
import { useCoreSDK } from '../../hooks/useCoreSDK'
import { usePlatformExplorerClient } from '../../hooks/usePlatformExplorerApi'
import type { LayoutContext } from '../../components/layout/Layout'
import { Stage1Intro } from './stages/Stage1Intro'
import { Stage2Payment } from './stages/Stage2Payment'
import { Stage3Processing } from './stages/Stage3Processing'
import { Stage4Success } from './stages/Stage4Success'
import { TopUpError } from './stages/TopUpError'
import { isTabView, closeCurrentExtensionTab } from '../../utils/extensionTab'
import { buildTopUpUrl } from '../../utils/topUpTabUrl'
import IdentityHeaderBadge from '../../components/identity/IdentityHeaderBadge'
import { MIN_TOPUP_FUNDING_DUFFS } from '../../../constants'
import { NetworkType } from '../../../types'

type Stage = 1 | 2 | 3 | 4

interface TopUpResult {
  identityId: string
  stateTransitionHash: string
  topUpAmount: bigint
  date: Date
}

function TopUpIdentityState (): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const context = useOutletContext<LayoutContext>()
  const { currentIdentity, currentWallet, allWallets, setHeaderConfigOverride, setHeaderComponent, currentNetwork } = context ?? {}
  const extensionAPI = useExtensionAPI()
  const platformExplorerClient = usePlatformExplorerClient()
  const [dashRate, setDashRate] = useState<number | null>(null)

  const [password, setPassword] = useState('')
  const [fundingAddress, setFundingAddress] = useState<string | null>(null)
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topUpResult, setTopUpResult] = useState<TopUpResult | null>(null)

  const rawStage = parseInt(searchParams.get('stage') ?? '1', 10)
  const stage = (rawStage >= 1 && rawStage <= 4 ? rawStage : 1) as Stage
  const hasError = searchParams.get('error') === 'true'

  // Pinned to the identity, wallet and network the flow was opened for, not the current selection.
  const identityId = searchParams.get('identity') ?? currentIdentity ?? null
  const walletId = searchParams.get('wallet') ?? currentWallet ?? null
  const network = (searchParams.get('network') as NetworkType | null) ?? currentNetwork ?? null

  // The tab outlives wallet and network switches, so the scope it was pinned to can go missing.
  const scopeError = useMemo(() => {
    if (identityId == null) return 'No identity was selected for this top-up'
    if (walletId == null || network == null) return 'No wallet was selected for this top-up'
    if (allWallets == null || allWallets.length === 0) return null

    const wallet = allWallets.find(item => item.walletId === walletId && item.network === network)

    if (wallet == null) return `Wallet was not found on ${network}, it may have been removed`

    return null
  }, [identityId, walletId, network, allWallets])

  const coreSDK = useCoreSDK(network ?? undefined)
  const walletName = useWalletName(walletId)

  useEffect(() => {
    if (network == null) return

    platformExplorerClient.fetchRate(network)
      .then(rate => setDashRate(rate))
      .catch(() => {})
  }, [network, platformExplorerClient])

  const stageUrl = useCallback((nextStage: Stage, failed = false): string =>
    buildTopUpUrl({ identityId, walletId, network }, nextStage, failed)
  , [identityId, walletId, network])

  useEffect(() => {
    if (setHeaderConfigOverride == null) return

    if (stage === 1 && !hasError) {
      setHeaderConfigOverride({ imageType: 'coin' })
    } else if ((stage === 3 || stage === 4) && !hasError) {
      // Payment is out and processing, going back would restart the detection.
      setHeaderConfigOverride({ hideLeftSection: true })
    } else {
      setHeaderConfigOverride(null)
    }

    return () => { setHeaderConfigOverride?.(null) }
  }, [stage, hasError, setHeaderConfigOverride])

  useEffect(() => {
    if (setHeaderComponent == null || identityId == null) return

    setHeaderComponent(
      <IdentityHeaderBadge identity={identityId} walletName={walletName} />
    )

    return () => { setHeaderComponent(null) }
  }, [identityId, walletName, setHeaderComponent])

  // The whole top-up runs inside this page, so closing it once the funding
  // payment is out strands that payment. Warn before the page goes away.
  const isInFlight = stage === 3 || (stage === 2 && transactionHash !== '')

  useEffect(() => {
    if (!isInFlight || hasError) return

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => { window.removeEventListener('beforeunload', handleBeforeUnload) }
  }, [isInFlight, hasError])

  const runTopUp = useCallback(async (address: string, txid: string, pwd: string): Promise<void> => {
    if (identityId == null) return

    void navigate(stageUrl(3))
    setError(null)

    try {
      const result = await extensionAPI.topUpIdentity(
        identityId, address, txid, pwd, walletId ?? undefined, network ?? undefined
      )
      setTopUpResult({
        identityId: result.identityId,
        stateTransitionHash: result.stateTransitionHash,
        topUpAmount: BigInt(result.topUpAmount),
        date: new Date()
      })
      void navigate(stageUrl(4))
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Top-up failed'
      setError(message)
      void navigate(stageUrl(3, true), { replace: true })
    }
  }, [extensionAPI, navigate, identityId, walletId, network, stageUrl])

  // Auto-detect payment on stage 2
  useEffect(() => {
    if (fundingAddress == null || stage !== 2) return

    let cancelled = false

    const detectPayment = async (): Promise<void> => {
      try {
        const { txid } = await coreSDK.waitForPayment(fundingAddress, MIN_TOPUP_FUNDING_DUFFS)
        if (cancelled) return
        setTransactionHash(txid)
        await runTopUp(fundingAddress, txid, password)
      } catch (e) {
        if (!cancelled) console.error('waitForPayment failed:', e)
      }
    }

    detectPayment().catch(console.error)

    return () => { cancelled = true }
  }, [fundingAddress, stage, coreSDK, runTopUp, password])

  // Request funding address when entering stage 2
  useEffect(() => {
    if (stage !== 2) return
    if (fundingAddress != null) return

    // Deriving the top-up key needs the password, which is lost on reload.
    if (password === '') {
      void navigate(stageUrl(1), { replace: true })
      return
    }

    const fetchAddress = async (): Promise<void> => {
      setIsLoadingAddress(true)
      setAddressError(null)

      try {
        const { address } = await extensionAPI.requestTopUpFundingAddress(
          password, identityId ?? undefined, walletId ?? undefined, network ?? undefined
        )
        setFundingAddress(address)
      } catch (e) {
        setAddressError(e instanceof Error ? e.message : 'Failed to generate funding address')
      } finally {
        setIsLoadingAddress(false)
      }
    }

    fetchAddress().catch(console.error)
  }, [stage, fundingAddress, password, identityId, walletId, network, extensionAPI, navigate, stageUrl])

  const handleNext = async (): Promise<void> => {
    if (password.trim() === '') {
      setError('Password is required to proceed')
      return
    }

    const passwordCheck = await extensionAPI.checkPassword(password)
    if (!passwordCheck.success) {
      setError('Invalid password')
      return
    }

    setError(null)
    void navigate(stageUrl(2))
  }

  const handleConfirmPayment = (): void => {
    if (fundingAddress == null) return
    runTopUp(fundingAddress, transactionHash, password).catch(console.error)
  }

  const handleDone = (): void => {
    if (isTabView()) {
      void closeCurrentExtensionTab()
      return
    }

    void navigate('/home')
  }

  const handleBack = (): void => {
    if (stage === 2) {
      setTransactionHash('')
      setShowManualEntry(false)
      setError(null)
      void navigate(stageUrl(1), { replace: true })
    } else if (isTabView() && window.history.length <= 1) {
      void closeCurrentExtensionTab()
    } else {
      void navigate(-1)
    }
  }

  // Once the payment is out, going back to waiting for it would pick up our own
  // asset lock transaction, so retry the same top-up instead.
  const canRetry = fundingAddress != null && transactionHash !== ''

  const handleErrorReturn = (): void => {
    if (canRetry) {
      runTopUp(fundingAddress, transactionHash, password).catch(console.error)
      return
    }

    setTransactionHash('')
    setShowManualEntry(false)
    setError(null)
    void navigate(stageUrl(2), { replace: true })
  }

  if (scopeError != null) {
    return (
      <TopUpError
        stage={stage}
        error={scopeError}
        actionText='Close'
        onReturnBack={handleDone}
      />
    )
  }

  if (hasError) {
    return (
      <TopUpError
        stage={stage}
        error={error}
        actionText={canRetry ? 'Try Again' : undefined}
        onReturnBack={handleErrorReturn}
      />
    )
  }

  if (stage === 1) {
    return (
      <Stage1Intro
        stage={stage}
        password={password}
        passwordError={error}
        onPasswordChange={(value) => {
          setPassword(value)
          setError(null)
        }}
        onNext={() => { handleNext().catch(console.error) }}
      />
    )
  }

  if (stage === 2) {
    return (
      <Stage2Payment
        stage={stage}
        isLoadingAddress={isLoadingAddress}
        fundingAddress={fundingAddress}
        addressError={addressError}
        showManualEntry={showManualEntry}
        transactionHash={transactionHash}
        onShowManualEntry={() => setShowManualEntry(true)}
        onTransactionHashChange={setTransactionHash}
        onConfirmPayment={handleConfirmPayment}
        onBack={handleBack}
      />
    )
  }

  if (stage === 3) {
    return <Stage3Processing stage={stage} />
  }

  return (
    <Stage4Success
      stage={stage}
      result={topUpResult}
      dashRate={dashRate}
      onDone={handleDone}
    />
  )
}

export default TopUpIdentityState
