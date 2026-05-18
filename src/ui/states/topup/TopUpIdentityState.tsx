import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom'
import { useExtensionAPI } from '../../hooks'
import { useCoreSDK } from '../../hooks/useCoreSDK'
import type { LayoutContext } from '../../components/layout/Layout'
import { Stage1Intro } from './stages/Stage1Intro'
import { Stage2Payment } from './stages/Stage2Payment'
import { Stage3Processing } from './stages/Stage3Processing'
import { Stage4Success } from './stages/Stage4Success'
import { TopUpError } from './stages/TopUpError'

type Stage = 1 | 2 | 3 | 4

interface TopUpResult {
  identityId: string
  stateTransitionHash: string
  topUpAmount: bigint | null
  date: Date
}

function TopUpIdentityState (): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const context = useOutletContext<LayoutContext>()
  const { currentIdentity, setHeaderConfigOverride } = context ?? {}
  const extensionAPI = useExtensionAPI()
  const coreSDK = useCoreSDK()

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

  useEffect(() => {
    if (setHeaderConfigOverride == null) return

    if (stage === 1 && !hasError) {
      setHeaderConfigOverride({ imageType: 'coin' })
    } else {
      setHeaderConfigOverride(null)
    }

    return () => { setHeaderConfigOverride?.(null) }
  }, [stage, hasError, setHeaderConfigOverride])

  const runTopUp = useCallback(async (address: string, txid: string, pwd: string): Promise<void> => {
    if (currentIdentity == null) return

    void navigate('/topup-identity?stage=3')
    setError(null)

    try {
      const result = await extensionAPI.topUpIdentity(currentIdentity, address, txid, pwd)
      setTopUpResult({
        identityId: result.identityId,
        stateTransitionHash: result.stateTransitionHash,
        topUpAmount: null,
        date: new Date()
      })
      void navigate('/topup-identity?stage=4')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Top-up failed'
      setError(message)
      void navigate('/topup-identity?stage=3&error=true', { replace: true })
    }
  }, [extensionAPI, navigate, currentIdentity])

  // Auto-detect payment on stage 2
  useEffect(() => {
    if (fundingAddress == null || stage !== 2) return

    let cancelled = false

    const detectPayment = async (): Promise<void> => {
      try {
        const { txid } = await coreSDK.waitForPayment(fundingAddress)
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

    const fetchAddress = async (): Promise<void> => {
      setIsLoadingAddress(true)
      setAddressError(null)

      try {
        const { address } = await extensionAPI.requestAssetLockFundingAddress()
        setFundingAddress(address)
      } catch (e) {
        setAddressError(e instanceof Error ? e.message : 'Failed to generate funding address')
      } finally {
        setIsLoadingAddress(false)
      }
    }

    fetchAddress().catch(console.error)
  }, [stage, fundingAddress, extensionAPI])

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
    void navigate('/topup-identity?stage=2')
  }

  const handleConfirmPayment = (): void => {
    if (fundingAddress == null) return
    runTopUp(fundingAddress, transactionHash, password).catch(console.error)
  }

  const handleDone = (): void => {
    void navigate('/home')
  }

  const handleBack = (): void => {
    if (stage === 2) {
      setTransactionHash('')
      setShowManualEntry(false)
      setError(null)
      void navigate('/topup-identity?stage=1', { replace: true })
    } else {
      void navigate(-1)
    }
  }

  const handleErrorReturn = (): void => {
    setTransactionHash('')
    setShowManualEntry(false)
    setError(null)
    void navigate('/topup-identity?stage=2', { replace: true })
  }

  if (hasError) {
    return (
      <TopUpError
        stage={stage}
        error={error}
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
      onDone={handleDone}
    />
  )
}

export default TopUpIdentityState
