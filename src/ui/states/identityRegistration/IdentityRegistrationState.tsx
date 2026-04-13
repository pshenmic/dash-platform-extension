import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom'
import { useStaticAsset } from '../../hooks/useStaticAsset'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import type { LayoutContext } from '../../components/layout/Layout'
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

  const [showManualEntry, setShowManualEntry] = useState(false)
  const [transactionHash, setTransactionHash] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [paymentAddress, setPaymentAddress] = useState<string | null>(null)
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [hasUnfinishedRegistration] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [registeredIdentifier, setRegisteredIdentifier] = useState<string | null>(null)

  const coinBagelImage = useStaticAsset('coin_bagel.png')
  const coinImage = useStaticAsset('coin.png')

  const stage = parseInt(searchParams.get('stage') ?? '1', 10) as Stage
  const hasError = searchParams.get('error') === 'true'

  useEffect(() => {
    const checkPendingRegistration = async (): Promise<void> => {
      // TODO: add check pending registration
    }

    void checkPendingRegistration()
  }, [extensionAPI])

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
    if (paymentAddress != null) return

    const fetchAddress = async (): Promise<void> => {
      setIsLoadingAddress(true)
      setAddressError(null)

      try {
        const address = await extensionAPI.requestOneTimeAddress()
        setPaymentAddress(address)
      } catch (e) {
        setAddressError(e instanceof Error ? e.message : 'Failed to generate payment address')
      } finally {
        setIsLoadingAddress(false)
      }
    }

    fetchAddress().catch((e) => {
      setAddressError(e instanceof Error ? e.message : 'Failed to generate payment address')
    })
  }, [stage, paymentAddress, extensionAPI])

  useEffect(() => {
    if (stage === 2 && hasUnfinishedRegistration) {
      void navigate('/register-identity?stage=3', { replace: true })
    }
  }, [stage, hasUnfinishedRegistration, navigate])

  const handleNext = (): void => {
    void navigate('/register-identity?stage=2')
  }

  const handleProceedToPayment = (): void => {
    if (password.trim() === '') {
      setPasswordError('Password is required to proceed')
      return
    }
    setPasswordError(null)
    void navigate('/register-identity?stage=3')
  }

  const handleConfirmPayment = (): void => {
    if (transactionHash.trim() === '') return
    if (paymentAddress == null) return

    setIsRegistering(true)
    setRegistrationError(null)

    void navigate('/register-identity?stage=4')

    const doRegister = async (): Promise<void> => {
      const response = await extensionAPI.registerIdentity(
        paymentAddress,
        transactionHash.trim(),
        password
      )

      setRegisteredIdentifier(response.identifier)
      void navigate('/register-identity?stage=5')
    }

    doRegister()
      .catch((e) => {
        const message = e instanceof Error ? e.message : String(e)
        setRegistrationError(message)
        void navigate('/register-identity?error=true&stage=4')
      })
      .finally(() => {
        setIsRegistering(false)
      })
  }

  const handleDone = (): void => {
    void navigate('/home')
  }

  const handleReturnBack = (): void => {
    void navigate('/register-identity?stage=1')
  }

  if (hasError) {
    return (
      <RegistrationError
        stage={stage}
        registrationError={registrationError}
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
        passwordError={passwordError}
        onPasswordChange={(value) => {
          setPassword(value)
          setPasswordError(null)
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
        paymentAddress={paymentAddress}
        addressError={addressError}
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
      registeredIdentifier={registeredIdentifier}
      onDone={handleDone}
    />
  )
}

export default IdentityRegistrationState
