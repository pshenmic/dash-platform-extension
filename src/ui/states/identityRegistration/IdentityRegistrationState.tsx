import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom'
import { Button, Text, CopyButton, Input, ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { FieldLabel } from '../../components/typography'
import { useStaticAsset } from '../../hooks/useStaticAsset'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { QRCodeSVG } from 'qrcode.react'
import { IdentityPreview } from '../../components/Identities'
import { DashCoreSDK, Transaction } from 'dash-core-sdk'
import type { IdentityPreviewData } from '../../types'
import type { LayoutContext } from '../../components/layout/Layout'

type Stage = 1 | 2 | 3 | 4 | 5

// TODO: Replace with actual check from storage
const hasUnfinishedRegistration = true

const mockIdentity: IdentityPreviewData = {
  id: 'EWNwtGEC1qAbgNgo2UgadmQhB9DaZtB942x8bXgJrPNS',
  name: 'test.dash',
  balance: '0.5',
  publicKeys: [
    {
      keyId: 0,
      purpose: 'AUTHENTICATION',
      securityLevel: 'MASTER',
      type: 'ECDSA_SECP256K1',
      isAvailable: true
    },
    {
      keyId: 1,
      purpose: 'AUTHENTICATION',
      securityLevel: 'CRITICAL',
      type: 'ECDSA_SECP256K1',
      isAvailable: true
    },
    {
      keyId: 2,
      purpose: 'AUTHENTICATION',
      securityLevel: 'HIGH',
      type: 'ECDSA_SECP256K1',
      isAvailable: true
    },
    {
      keyId: 3,
      purpose: 'ENCRYPTION',
      securityLevel: 'MEDIUM',
      type: 'ECDSA_SECP256K1',
      isAvailable: true
    }
  ]
}

const mockPaymentAddress = 'QMfCRPcjXoTnZa9sA9JR2KWgGGDFGDHJDGASFS'

function IdentityRegistrationState (): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const context = useOutletContext<LayoutContext>()
  const { setHeaderConfigOverride } = context ?? {}
  const extensionAPI = useExtensionAPI()
  const dashCoreSDK = new DashCoreSDK('https://52.24.124.162:1443')

  const [showManualEntry, setShowManualEntry] = useState(false)
  const [transactionHash, setTransactionHash] = useState('') // rename to txid
  const [outputIndex, setOutputIndex] = useState('0')
  const [coreChainLockedHeight, setCoreChainLockedHeight] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [paymentAddress, setPaymentAddress] = useState<string | null>(null)
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [hasUnfinishedRegistration, setHasUnfinishedRegistration] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [registeredIdentifier, setRegisteredIdentifier] = useState<string | null>(null)

  const [error, setError] = useState('')

  const coinBagelImage = useStaticAsset('coin_bagel.png')
  const coinImage = useStaticAsset('coin.png')

  const stage = parseInt(searchParams.get('stage') ?? '1', 10) as Stage
  const hasError = searchParams.get('error') === 'true'

  if (error !== '') {
    console.log('error', error)
  }

  useEffect(() => {
    const waitForPayment = async (): Promise<void> => {
      if (paymentAddress != null) {
        console.log('await for payment on address', paymentAddress)
        const paymentRes = await dashCoreSDK.waitForPayment(paymentAddress)
        console.log('paymentRes', paymentRes)
      }
    }

    waitForPayment().catch((e) => setError(e))
  }, [paymentAddress])

  // Check for unfinished registration on mount
  useEffect(() => {
    const checkPendingRegistration = async (): Promise<void> => {
      // TODO: add check pending registration
    }

    void checkPendingRegistration()
  }, [extensionAPI])

  // Configure header based on current stage
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

  // Stage 3: Request a one-time address when entering this stage
  useEffect(() => {
    if (stage !== 3) return

    // Reuse the existing pending address if available
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

    fetchAddress().catch((e) => setError(e))
  }, [stage, paymentAddress, extensionAPI])

  // Stage 4: Process registration after payment confirmation
  useEffect(() => {
    if (stage === 4) {
      const timer = setTimeout(() => {
        void navigate('/register-identity?stage=5')
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [stage, navigate])

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

    const register = async (): Promise<void> => {
      const getTransactionRes = await dashCoreSDK.getTransaction(transactionHash)
      console.log('getTransactionRes', getTransactionRes)
      console.log('getTransactionRes?.transaction', getTransactionRes?.transaction)
      const coreTransaction = Transaction.fromBytes(getTransactionRes?.transaction)
      console.log('coreTransaction', coreTransaction)
    }

    register().catch((e) => setError(e))

    void navigate('/register-identity?stage=4')
  }

  const handleDone = (): void => {
    void navigate('/home')
  }

  const handleRestart = useCallback((): void => {
    setPaymentAddress(null)
    setHasUnfinishedRegistration(false)
    void navigate('/register-identity?stage=1')
  }, [navigate])

  const handleContinueRegistration = (): void => {
    void navigate('/register-identity?stage=3')
  }

  const handleReturnBack = (): void => {
    void navigate('/register-identity?stage=1')
  }

  // Error state
  if (hasError) {
    return (
      <div className='flex flex-col h-full pt-[90px]'>
        <TitleBlock
          title={
            <>
              <span className='font-normal'>There Was<br />an</span> Error With<br />Registration
            </>
          }
          description={registrationError ?? 'An unexpected error occurred while registering identity.'}
          logoSize='3rem'
          showLogo
          containerClassName='mb-0'
        />

        <div className='flex-1' />

        <div className='flex flex-col gap-4'>
          <Button
            colorScheme='lightBlue'
            className='w-full'
            onClick={handleReturnBack}
          >
            Return Back
          </Button>
          <ProgressStepBar
            totalSteps={5}
            currentStep={stage}
            color='red'
          />
        </div>
      </div>
    )
  }

  // Stage 1: Introduction
  if (stage === 1) {
    return (
      <div className='flex flex-col h-full'>
        <div className='pt-[176px]'>
          <TitleBlock
            title='Identity Registration'
            description='Lets start the identity creation process. A small fee will be taken for the registration. To continue press next.'
            logoSize='3rem'
            showLogo
            containerClassName='mb-0'
          />
        </div>

        <div className='flex-1' />

        <div className='flex flex-col gap-4'>
          <Button
            colorScheme='brand'
            className='w-full'
            onClick={handleNext}
          >
            Next
          </Button>
          <ProgressStepBar totalSteps={5} currentStep={stage} />
        </div>
      </div>
    )
  }

  // Stage 2: Unfinished registration or fee info + password
  if (stage === 2) {
    if (hasUnfinishedRegistration) {
      return (
        <div className='flex flex-col h-full'>
          <div className='pt-[176px]'>
            <TitleBlock
              title={<>You Have an<br />Unfinished<br />Registration</>}
              description='You have a pending identity registration. You can continue from where you left off or restart the process.'
              logoSize='3rem'
              showLogo
              containerClassName='mb-0'
            />
          </div>

          <div className='flex-1' />

          <div className='flex flex-col gap-4'>
            <div className='flex gap-2'>
              <Button
                colorScheme='lightBlue'
                className='flex-1'
                onClick={handleRestart}
              >
                Restart
              </Button>
              <Button
                colorScheme='brand'
                className='flex-1'
                onClick={handleContinueRegistration}
              >
                Continue
              </Button>
            </div>
            <ProgressStepBar totalSteps={5} currentStep={stage} />
          </div>
        </div>
      )
    }

    return (
      <div className='flex flex-col h-full'>
        <TitleBlock
          title='Registration Fee'
          description='Identity registration on Dash Platform requires a small network fee. This one-time payment covers the cost of storing your identity on the blockchain.'
          logoSize='3rem'
          showLogo
          containerClassName='mb-0'
        />

        <div className='flex-1 flex items-center justify-center relative'>
          <div className='w-[200px] h-[200px]'>
            <img src={coinImage} alt='Dash coin' className='w-full h-full object-contain' />
          </div>
          <div className='absolute top-[10px] right-[24px] w-[100px] h-[100px] rotate-34'>
            <img src={coinImage} alt='Dash coin' className='w-full h-full object-contain' />
          </div>
          <div className='absolute bottom-[34px] left-[24px] w-[100px] h-[100px] -rotate-31'>
            <img src={coinImage} alt='Dash coin' className='w-full h-full object-contain' />
          </div>
        </div>

        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-2'>
            <FieldLabel>Password</FieldLabel>
            <Input
              type='password'
              placeholder='Enter your wallet password'
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordError(null)
              }}
              error={passwordError != null}
            />
            {passwordError != null && (
              <Text size='sm' className='text-red-500'>{passwordError}</Text>
            )}
          </div>
          <Button
            colorScheme='brand'
            className='w-full'
            onClick={handleProceedToPayment}
          >
            Continue To Payment
          </Button>
          <ProgressStepBar totalSteps={5} currentStep={stage} />
        </div>
      </div>
    )
  }

  // Stage 3: Waiting for payment with QR code
  if (stage === 3) {
    return (
      <div className='flex flex-col h-full'>
        <TitleBlock
          title='Waiting for Payment'
          description='Send any desired amount (over 0.1 Dash) to the address below. Your private keys are stored securely and never leave this device.'
          logoSize='3rem'
          showLogo
          containerClassName='mb-0'
        />

        <div className='mt-6'>
          <div className='bg-dash-primary-dark-blue/[0.04] rounded-3xl p-6 flex gap-6 items-center'>
            <div className='flex-shrink-0'>
              {isLoadingAddress
                ? (
                  <div className='w-[100px] h-[100px] flex items-center justify-center'>
                    <Text size='xs' dim>Loading...</Text>
                  </div>
                  )
                : (
                  <QRCodeSVG
                    value={paymentAddress ?? ''}
                    fgColor='#4C7EFF'
                    bgColor='transparent'
                    size={100}
                  />
                  )}
            </div>
            <div className='flex flex-col gap-1 flex-1 min-w-0'>
              {addressError != null
                ? (
                  <Text size='sm' className='text-red-500 break-all'>{addressError}</Text>
                  )
                : (
                  <>
                    <div className='flex items-center gap-2'>
                      <Text
                        size='sm'
                        weight='medium'
                        className='text-dash-primary-dark-blue leading-[1.366em] tracking-[-0.01em] break-all'
                      >
                        {isLoadingAddress ? 'Generating address…' : (paymentAddress ?? '')}
                      </Text>
                      {paymentAddress != null && !isLoadingAddress && (
                        <div className='flex-shrink-0'>
                          <CopyButton text={paymentAddress} />
                        </div>
                      )}
                    </div>
                    <Text className='text-xs' dim>
                      You can send any amount convenient for you (over 0.1 Dash). We are ready to accept a transfer at any time!
                    </Text>
                  </>
                  )}
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-4 mt-6'>
          {!showManualEntry
            ? (
              <Button
                colorScheme='lightBlue'
                className='w-full'
                onClick={() => setShowManualEntry(true)}
              >
                I made a payment
              </Button>
              )
            : (
              <div className='flex flex-col gap-2'>
                <FieldLabel>Transaction ID (txid)</FieldLabel>
                <Input
                  placeholder='64-character transaction hash'
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                />
                {/*<FieldLabel>Output Index</FieldLabel>*/}
                {/*<Input*/}
                {/*  placeholder='0'*/}
                {/*  value={outputIndex}*/}
                {/*  onChange={(e) => setOutputIndex(e.target.value)}*/}
                {/*/>*/}
                {/*<FieldLabel>Core Chain Locked Height</FieldLabel>*/}
                {/*<Input*/}
                {/*  placeholder='e.g. 2000000'*/}
                {/*  value={coreChainLockedHeight}*/}
                {/*  onChange={(e) => setCoreChainLockedHeight(e.target.value)}*/}
                {/*/>*/}
                <Button
                  colorScheme='brand'
                  className='w-full'
                  disabled={
                    transactionHash.trim().length !== 64 ||
                    // coreChainLockedHeight.trim() === '' ||
                    paymentAddress == null
                  }
                  onClick={handleConfirmPayment}
                >
                  Confirm
                </Button>
              </div>
              )}
          <ProgressStepBar totalSteps={5} currentStep={stage} />
        </div>
      </div>
    )
  }

  // Stage 4: Processing registration (triggered automatically by useEffect)
  if (stage === 4) {
    return (
      <div className='flex flex-col h-full relative'>
        <div className='absolute right-[-1rem] top-[100%] w-full h-[240px] overflow-hidden pointer-events-none translate-y-[-40%] translate-y-[-100%]'>
          <img src={coinBagelImage} alt='' className='w-[552px] h-[513px] object-cover object-left' />
        </div>
        <div
          className='absolute h-[130px]'
          style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1) 85%)',
            top: '100%',
            width: 'calc(100% + 1rem)',
            transform: 'translateY(calc(-100% + 0.875rem))'
          }}
        />

        <div className='relative z-10 flex flex-col h-full'>
          <TitleBlock
            title={isRegistering ? <>Registering your<br />Identity…</> : <> We received your<br />payment</>}
            description={
              isRegistering
                ? 'Please wait while we register your identity on the Dash Platform network.'
                : 'Please kindly wait for all Identity registration transactions to be processed by the network. Usually, it takes less than 10 seconds.'
            }
            logoSize='3rem'
            showLogo
            containerClassName='mb-0'
          />

          <div className='flex-1' />

          <div>
            <ProgressStepBar totalSteps={5} currentStep={stage} />
          </div>
        </div>
      </div>
    )
  }

  // Stage 5: Success
  return (
    <div className='flex flex-col h-full'>
      <TitleBlock
        title='Congratulations!'
        description="Now you have your first Identity and you're ready to dive into the space of truly decentralized Web3 applications. Check out latest Dash Platform DApps on dashdapps.com"
        logoSize='3rem'
        showLogo
        containerClassName='mb-0'
      />

      {registeredIdentifier != null && (
        <div className='mt-3'>
          <IdentityPreview identity={mockIdentity} />
        </div>
      )}

      <div className='flex-1' />

      <div className='pb-[15px] flex flex-col gap-4 mt-8'>
        <Button
          colorScheme='brand'
          className='w-full'
          onClick={handleDone}
        >
          Done
        </Button>
        <ProgressStepBar totalSteps={5} currentStep={stage} />
      </div>
    </div>
  )
}

export default IdentityRegistrationState
