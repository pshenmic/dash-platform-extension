import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom'
import { useSdk, useExtensionAPI, useStaticAsset } from '../../hooks'
import { useCoreSDK } from '../../hooks/useCoreSDK'
import type { LayoutContext } from '../../components/layout/Layout'
import type { IdentityPreviewData, PublicKeyData } from '../../types'
import { RegistrationError } from './stages/RegistrationError'
import { Stage1Intro } from './stages/Stage1Intro'
import { Stage2Fee } from './stages/Stage2Fee'
import { Stage3Payment } from './stages/Stage3Payment'
import { Stage4Processing } from './stages/Stage4Processing'
import { Stage5Success } from './stages/Stage5Success'

type Stage = 1 | 2 | 3 | 4 | 5

function IdentityRegistrationState (): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const context = useOutletContext<LayoutContext>()
  const { setHeaderConfigOverride } = context ?? {}
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const coreSDK = useCoreSDK()

  const [showManualEntry, setShowManualEntry] = useState(false)
  const [transactionHash, setTransactionHash] = useState('')
  const [password, setPassword] = useState('')
  const [fundingAddress, setFundingAddress] = useState<string | null>(null)
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [hasUnfinishedRegistration, setHasUnfinishedRegistration] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registeredIdentity, setRegisteredIdentity] = useState<IdentityPreviewData | null>(null)

  const coinBagelImage = useStaticAsset('coin_bagel.png')
  const coinImage = useStaticAsset('coin.png')

  const stage = parseInt(searchParams.get('stage') ?? '1', 10) as Stage
  const hasError = searchParams.get('error') === 'true'

  const runRegistration = useCallback(async (address: string, txid: string, pwd: string): Promise<void> => {
    setIsRegistering(true)
    setError(null)

    try {
      const { identifier } = await extensionAPI.registerIdentity(address, txid, pwd)

      const [balance, keys] = await Promise.all([
        sdk.identities.getIdentityBalance(identifier),
        sdk.identities.getIdentityPublicKeys(identifier)
      ])

      const publicKeys: PublicKeyData[] = keys.map(key => ({
        keyId: key.keyId,
        purpose: key.purpose,
        securityLevel: key.securityLevel,
        type: key.keyType,
        isAvailable: key.disabledAt == null
      }))

      setRegisteredIdentity({ id: identifier, balance: balance.toString(), publicKeys })
      void navigate('/register-identity?stage=5')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Registration failed'
      setError(message)
      void navigate('/register-identity?stage=4&error=true', { replace: true })
    } finally {
      setIsRegistering(false)
    }
  }, [extensionAPI, sdk, navigate])

  useEffect(() => {
    const checkPendingRegistration = async (): Promise<void> => {
      // TODO: add check pending registration
    }

    void checkPendingRegistration()
  }, [extensionAPI])

  useEffect(() => {
    if (fundingAddress == null || stage !== 3) return

    let cancelled = false

    const detectPayment = async (): Promise<void> => {
      try {
        const { txid } = await coreSDK.waitForPayment(fundingAddress)
        if (cancelled) return
        setTransactionHash(txid)
        void navigate('/register-identity?stage=4')
        await runRegistration(fundingAddress, txid, password)
      } catch (e) {
        if (!cancelled) console.error('waitForPayment failed:', e)
      }
    }

    detectPayment().catch(console.error)

    return () => { cancelled = true }
  }, [fundingAddress, stage, coreSDK, navigate, runRegistration, password])

  useEffect(() => {
    if (setHeaderConfigOverride == null) return

    if (hasError) {
      setHeaderConfigOverride({ imageType: 'warning' })
    } else if (stage === 1) {
      setHeaderConfigOverride({
        imageType: 'app',
        imageClasses: '-mt-[20%] !w-[412px]',
        containerClasses: 'absolute top-0 right-0 -mr-[25%]'
      })
    } else if (stage === 2 && hasUnfinishedRegistration) {
      setHeaderConfigOverride({ imageType: 'userChain' })
    } else {
      setHeaderConfigOverride(null)
    }

    return () => {
      setHeaderConfigOverride?.(null)
    }
  }, [stage, hasError, hasUnfinishedRegistration, setHeaderConfigOverride])

  useEffect(() => {
    if (stage !== 3) return
    if (fundingAddress != null) return

    const fetchAddress = async (): Promise<void> => {
      setIsLoadingAddress(true)
      setError(null)

      try {
        const { address } = await extensionAPI.requestAssetLockFundingAddress()
        setFundingAddress(address)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate funding address')
      } finally {
        setIsLoadingAddress(false)
      }
    }

    fetchAddress().catch(console.error)
  }, [stage, fundingAddress, extensionAPI])

  useEffect(() => {
    if (stage === 2 && hasUnfinishedRegistration) {
      void navigate('/register-identity?stage=3', { replace: true })
    }
  }, [stage, hasUnfinishedRegistration, navigate])

  const handleNext = (): void => {
    void navigate('/register-identity?stage=2')
  }

  const handleProceedToPayment = async () => {
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
    void navigate('/register-identity?stage=3')
  }

  const handleConfirmPayment = (): void => {
    if (transactionHash.trim() === '' || fundingAddress == null) return
    runRegistration(fundingAddress, transactionHash, password).catch(console.error)
    void navigate('/register-identity?stage=4')
  }

  const handleDone = (): void => {
    void navigate('/home')
  }

  const handleReturnBack = (): void => {
    setFundingAddress(null)
    setTransactionHash('')
    setShowManualEntry(false)
    setError(null)
    void navigate('/register-identity?stage=3', { replace: true })
  }

  if (hasError) {
    return (
      <RegistrationError
        stage={stage}
        registrationError={error}
        onReturnBack={handleReturnBack}
      />
    )
  }

  if (stage === 1) {
    return <Stage1Intro stage={stage} onNext={handleNext} />
  }

  if (stage === 2) {
    return (
      <Stage2Fee
        stage={stage}
        coinImage={coinImage}
        password={password}
        passwordError={error}
        onPasswordChange={(value) => {
          setPassword(value)
          setError(null)
        }}
        onProceedToPayment={handleProceedToPayment}
      />
    )
  }

  if (stage === 3) {
    return (
      <Stage3Payment
        stage={stage}
        isLoadingAddress={isLoadingAddress}
        fundingAddress={fundingAddress}
        addressError={error}
        showManualEntry={showManualEntry}
        transactionHash={transactionHash}
        onShowManualEntry={() => setShowManualEntry(true)}
        onTransactionHashChange={setTransactionHash}
        onConfirmPayment={handleConfirmPayment}
      />
    )
  }

  if (stage === 4) {
    return (
      <Stage4Processing
        stage={stage}
        coinBagelImage={coinBagelImage}
        isRegistering={isRegistering}
      />
    )
  }

  return (
    <Stage5Success
      stage={stage}
      identity={registeredIdentity}
      onDone={handleDone}
    />
  )
}

export default IdentityRegistrationState
