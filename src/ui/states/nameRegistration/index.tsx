import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { UsernameInput } from '../../components/names'
import { Text, Identifier, ValueCard, InfoCircleIcon, DashLogo } from 'dash-ui-kit/react'
import type { LayoutContext } from '../../components/layout/Layout'
import { useAsyncState, useSdk, usePlatformExplorerClient, useExtensionAPI, useSigningKeys } from '../../hooks'
import { UsernameStep } from './UsernameStep'
import { ConfirmationStep } from './ConfirmationStep'
import { MissingRequiredKeyWarning, type KeyRequirement } from '../../components/keys'
import { isKeyCompatible, creditsToDash } from '../../../utils'
import { CONTESTED_NAME_COST_DASH, REGULAR_NAME_COST_DASH, NAME_SUFFIX } from './constants'
type Step = 1 | 2

const NameRegistrationState: React.FC = () => {
  const sdk = useSdk()
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const { currentNetwork, currentIdentity } = useOutletContext<LayoutContext>()
  const keyRequirements: KeyRequirement[] = [
    { purpose: 'AUTHENTICATION', securityLevel: 'HIGH' }
  ]

  const [username, setUsername] = useState('')
  const [isContested, setIsContested] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [isAvailable, setIsAvailable] = useState(true)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [hasSufficientBalance, setHasSufficientBalance] = useState(true)
  const [isCheckingBalance, setIsCheckingBalance] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [password, setPassword] = useState<string>('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<'premium' | 'regular' | null>(null)
  const {
    signingKeys,
    selectedSigningKey,
    setSelectedSigningKey,
    loading: signingKeysLoading,
    error: signingKeysError
  } = useSigningKeys({
    identity: currentIdentity
  })
  const [rateState, loadRate] = useAsyncState<number>()
  const platformClient = usePlatformExplorerClient()

  // Check if there are compatible keys available
  const compatibleKeys = signingKeys.filter(key => isKeyCompatible(key, keyRequirements))
  const hasCompatibleKeys = compatibleKeys.length > 0

  const handleUsernameChange = (value: string): void => {
    setUsername(value)
    setIsValid(value.length >= 3 && /^[a-zA-Z0-9_-]+$/.test(value))
  }

  const registerName = async (): Promise<void> => {
    if (currentIdentity == null || username === '' || selectedSigningKey == null || isRegistering) {
      return
    }

    if (password === '') {
      setPasswordError('Password is required')
      return
    }

    try {
      setIsRegistering(true)
      setRegistrationError(null)
      setPasswordError(null)

      // Prepare the full name (add NAME_SUFFIX if not present)
      const fullName = username.includes(NAME_SUFFIX) ? username : `${username}${NAME_SUFFIX}`

      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        setPasswordError('Invalid password')
        setIsRegistering(false)
        return
      }

      if (selectedSigningKey == null) {
        setPasswordError('Key not selected')
        setIsRegistering(false)
        return
      }

      const keyId = Number(selectedSigningKey)

      // Use extensionAPI.registerUsername method
      await extensionAPI.registerUsername(fullName, currentIdentity, keyId, password)

      setPassword('')
      void navigate('/home')
    } catch (error) {
      console.log('Failed to register username:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setRegistrationError(errorMessage)
    } finally {
      setIsRegistering(false)
    }
  }

  useEffect(() => {
    loadRate(async () => {
      return await platformClient.fetchRate(currentNetwork)
    }).catch(e => console.log('loadRate error:', e))
  }, [currentNetwork, platformClient, loadRate])

  useEffect(() => {
    if (currentIdentity == null) {
      setHasSufficientBalance(true)
      return
    }

    const checkBalance = async (): Promise<void> => {
      setIsCheckingBalance(true)
      const balance = await sdk.identities.getIdentityBalance(currentIdentity)
      const dashBalance = creditsToDash(balance)
      setHasSufficientBalance(dashBalance >= CONTESTED_NAME_COST_DASH)
    }

    checkBalance()
      .catch(e => {
        console.log('Error checking balance:', e)
        setHasSufficientBalance(true)
      })
      .finally(() => setIsCheckingBalance(false))
  }, [currentIdentity, sdk])

  useEffect(() => {
    if (username !== '') {
      const checkNameAvailability = async (): Promise<void> => {
        setIsCheckingAvailability(true)
        const fullName = username.includes(NAME_SUFFIX) ? username : `${username}${NAME_SUFFIX}`

        // Check if name is contested
        const contested = sdk.names.testNameContested(fullName)
        setIsContested(contested)

        // Check if name is available using searchByName
        const existingNames = await sdk.names.searchByName(fullName)
        setIsAvailable(existingNames.length === 0)
      }

      checkNameAvailability()
        .catch((e) => {
          console.log('Error checking name availability:', e)
          setIsContested(false)
          setIsAvailable(true)
        })
        .finally(() => setIsCheckingAvailability(false))
    } else {
      setIsContested(false)
      setIsAvailable(true)
      setIsCheckingAvailability(false)
    }
  }, [username, sdk])

  const handleCancel = useCallback(() => {
    setCurrentStep(1)
    setRegistrationError(null)
    setPassword('')
    setPasswordError(null)
    setSelectedSigningKey(null)
  }, [])

  const getTypeCardOpacity = useCallback((cardType: 'premium' | 'regular') => {
    if (hoveredCard === cardType) return 'opacity-100'
    if (hoveredCard) {
      return cardType === 'premium'
        ? (isContested ? 'opacity-70' : 'opacity-50')
        : (!isContested ? 'opacity-70' : 'opacity-50')
    }
    return cardType === 'premium'
      ? (isContested ? 'opacity-100' : 'opacity-50')
      : (!isContested ? 'opacity-100' : 'opacity-50')
  }, [hoveredCard, isContested])

  const NameBlock = useMemo(() => {
    switch (currentStep) {
      case 1: return (
        <UsernameInput
          value={username}
          onChange={handleUsernameChange}
          placeholder='username'
          autoFocus
        />
      )
      case 2: return (
        <div className='text-center'>
          <Text weight='bold' className='font-mono text-gray-900 !text-3xl'>
            {username}
          </Text>
          <Text size='sm' color='blue'>
            {NAME_SUFFIX}
          </Text>
        </div>
      )
    }
  }, [currentStep, username, handleUsernameChange])

  return (
    <div className='flex flex-col h-full min-h-max'>
      <TitleBlock
        title={<>{currentStep === 1 ? 'Create' : 'Confirm'} your<br />Dash Username</>}
        description={currentStep === 1
          ? 'You will not be able to change it in the future'
          : `You have chosen ${username} as your username. Please note that you can't change your name once it is registered.`}
        showLogo={false}
      />

      {(currentStep === 1 && !signingKeysLoading && !hasCompatibleKeys)
        ? (
          <div className='flex-grow'>
            <MissingRequiredKeyWarning
              keyRequirements={keyRequirements}
              description='You need to add a private key with the above requirements to register a username.'
            />
          </div>
          )
        : (
          <div className='flex flex-col gap-6 flex-grow'>
            <div className='flex justify-center'>
              {NameBlock}
            </div>

            <div className='text-center leading-none'>
              <Text size='xs' dim className='mb-1 inline-block'>
                This username will be created for identity
              </Text>

              <Identifier
                highlight='both'
                size='xs'
                className='text-center text-xs'
              >
                {currentIdentity ?? undefined}
              </Identifier>
            </div>
          </div>
          )}

      {currentStep === 1 && ((username.length > 0 && (!isValid || !isAvailable)) || !hasSufficientBalance) && (
        <ValueCard
          border={false}
          className='!text-[0.75rem] dash-shadow-xl text-dash-primary-dark-blue/75 mt-6'
        >
          {!hasSufficientBalance
            ? `Insufficient balance. You need at least ${CONTESTED_NAME_COST_DASH} DASH equivalent in credits to register a username.`
            : !isValid
                ? 'Username must be at least 3 characters and contain only letters, numbers, hyphens, and underscores'
                : 'This username is already taken. Please choose a different one.'}
        </ValueCard>
      )}

      <div className='flex flex-col gap-4 w-full mt-6 relative'>
        {currentStep === 1
          ? (
            <>
              <div className={`absolute left-0 -top-[70px] w-full flex items-center gap-3 p-3 bg-white rounded-xl border-l-2 border-dash-primary-dark-blue shadow-[0_0_75px_rgba(0,0,0,0.1)] z-10 transition-all duration-200 ${
                hoveredCard != null ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}
              >
                <InfoCircleIcon className='w-[1.625rem] h-[1.625rem] flex-shrink-0 text-gray-400' />
                <Text size='xs' weight='medium' className='flex-1'>
                  {hoveredCard === 'premium'
                    ? 'This username falls under the rules of a contested username. Masternodes will vote for your username approval'
                    : 'This is a regular, non-contested username. It will be registered immediately without masternode voting'}
                </Text>
              </div>

              <div className='flex gap-2 w-full'>
                <ValueCard
                  className={`relative items-center justify-between w-full cursor-pointer transition-opacity ${getTypeCardOpacity('premium')}`}
                  colorScheme='lightGray'
                  border={false}
                  onMouseEnter={() => setHoveredCard('premium')}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className='flex flex-col gap-1'>
                    <div className='flex gap-1'>
                      <Text size='sm' weight='bold'>
                        Premium
                      </Text>
                      <Text size='sm'>
                        Name:
                      </Text>
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <Text size='xs' weight='medium'>
                        {CONTESTED_NAME_COST_DASH}
                      </Text>
                      <Text size='xs' color='muted'>
                        <DashLogo size={10} className='!text-dash-primary-dark-blue' />
                      </Text>
                      {rateState.data != null && (
                        <ValueCard colorScheme='lightBlue' size='xs' border={false}>
                          <Text size='xs' color='blue' weight='medium'>
                            ~ ${(CONTESTED_NAME_COST_DASH * rateState.data).toFixed(2)}
                          </Text>
                        </ValueCard>
                      )}
                    </div>
                  </div>
                  <div className='absolute right-1 top-1'>
                    <InfoCircleIcon className='w-5 h-5 text-gray-400' />
                  </div>
                </ValueCard>

                <ValueCard
                  className={`relative items-center justify-between w-full cursor-pointer transition-opacity ${getTypeCardOpacity('regular')}`}
                  colorScheme='lightGray'
                  border={false}
                  onMouseEnter={() => setHoveredCard('regular')}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className='flex flex-col gap-1'>
                    <div className='flex gap-1'>
                      <Text size='sm' weight='bold'>
                        Regular
                      </Text>
                      <Text size='sm'>
                        Name:
                      </Text>
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <Text size='xs' weight='medium'>
                        {REGULAR_NAME_COST_DASH}
                      </Text>
                      <Text size='xs' color='muted'>
                        <DashLogo size={10} className='!text-dash-primary-dark-blue' />
                      </Text>
                      {rateState.data != null && (
                        <ValueCard colorScheme='lightBlue' size='xs' border={false}>
                          <Text size='xs' color='blue' weight='medium'>
                            ~ ${(REGULAR_NAME_COST_DASH * rateState.data).toFixed(2)}
                          </Text>
                        </ValueCard>
                      )}
                    </div>
                  </div>
                  <div className='absolute right-1 top-1'>
                    <InfoCircleIcon className='w-5 h-5 text-gray-400' />
                  </div>
                </ValueCard>
              </div>

              <UsernameStep
                isValid={isValid}
                isAvailable={isAvailable}
                isCheckingAvailability={isCheckingAvailability}
                hasSufficientBalance={hasSufficientBalance}
                isCheckingBalance={isCheckingBalance}
                hasCompatibleKeys={hasCompatibleKeys}
                onRequestUsername={() => setCurrentStep(2)}
              />
            </>
            )
          : (
            <ConfirmationStep
              rateData={rateState.data}
              password={password}
              passwordError={passwordError}
              selectedSigningKey={selectedSigningKey}
              signingKeys={signingKeys}
              signingKeysLoading={signingKeysLoading}
              signingKeysError={signingKeysError}
              keyRequirements={keyRequirements}
              isRegistering={isRegistering}
              registrationError={registrationError}
              onCancel={handleCancel}
              onConfirm={() => { void registerName() }}
              onPasswordChange={(value: string) => setPassword(value)}
              onSigningKeyChange={(keyId: string) => setSelectedSigningKey(keyId)}
            />
            )}
      </div>
    </div>
  )
}

export default NameRegistrationState
