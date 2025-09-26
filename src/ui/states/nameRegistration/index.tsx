import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { UsernameInput } from '../../components/names'
import { Text, Identifier, ValueCard } from 'dash-ui-kit/react'
import type { LayoutContext } from '../../components/layout/Layout'
import { useAsyncState, useSdk, usePlatformExplorerClient, useExtensionAPI, useSigningKeys } from '../../hooks'
import { UsernameStep } from './UsernameStep'
import { ConfirmationStep } from './ConfirmationStep'
import type { KeyRequirement } from '../../components/keys'
import { isKeyCompatible, creditsToDash } from '../../../utils'
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

  console.log('signingKeys', signingKeys)
  console.log('compatibleKeys', compatibleKeys)
  console.log('hasCompatibleKeys', hasCompatibleKeys)

  const handleUsernameChange = (value: string): void => {
    setUsername(value)
    setIsValid(value.length >= 3 && /^[a-zA-Z0-9_-]+$/.test(value))
  }

  const registerName = async (): Promise<void> => {
    if ((currentIdentity == null || currentIdentity === '') || username === '' || (selectedSigningKey == null || selectedSigningKey === '') || isRegistering) {
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

      console.log('Starting name registration for:', username)

      // Prepare the full name (add .dash if not present)
      const fullName = username.includes('.dash') ? username : `${username}.dash`

      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        setPasswordError('Invalid password')
        setIsRegistering(false)
        return
      }

      if (selectedSigningKey == null || selectedSigningKey === '') {
        setPasswordError('Key not selected')
        setIsRegistering(false)
        return
      }

      const keyId = Number(selectedSigningKey)

      console.log('Registering username via extensionAPI:', {
        fullUsername: fullName,
        identity: currentIdentity,
        keyId,
        isContested
      })

      // Use extensionAPI.registerUsername method
      const res = await extensionAPI.registerUsername(fullName, currentIdentity, keyId, password)

      console.log('res', res)
      console.log('Username registration successful!')

      void navigate('/home')
    } catch (error) {
      console.log('Failed to register username:', error)
      const errorMessage = error instanceof Error ? error.message : (String(error) ?? 'Unknown error occurred')
      setRegistrationError(errorMessage)
    } finally {
      setIsRegistering(false)
    }

    setIsRegistering(false)
  }

  useEffect(() => {
    loadRate(async () => {
      return await platformClient.fetchRate(currentNetwork)
    }).catch(e => console.log('loadRate error:', e))
  }, [currentNetwork, platformClient, loadRate])

  useEffect(() => {
    if (currentIdentity == null || currentIdentity === '') {
      setHasSufficientBalance(true)
      return
    }

    const checkBalance = async (): Promise<void> => {
      setIsCheckingBalance(true)
      const balance = await sdk.identities.getIdentityBalance(currentIdentity)
      const dashBalance = creditsToDash(balance)
      const requiredDash = 0.25
      setHasSufficientBalance(dashBalance >= requiredDash)
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
        const fullName = username.includes('.dash') ? username : `${username}.dash`

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

  const NameBlock = useCallback(() => {
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
            .dash
          </Text>
        </div>
      )
    }
  }, [currentStep, username, handleUsernameChange, signingKeysLoading, hasCompatibleKeys, keyRequirements, navigate])

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
            <ValueCard colorScheme='yellow' size='xl' border={false} className='flex flex-col items-start gap-4'>
              <Text size='md' weight='medium'>
                Missing Required Key
              </Text>
              <div className='flex flex-col gap-2'>
                {keyRequirements.map((req, index) => (
                  <div key={index} className='flex items-center gap-2'>
                    <ValueCard colorScheme='white' size='sm' className='px-2 py-1'>
                      <Text size='sm'>{req.purpose}</Text>
                    </ValueCard>
                    <ValueCard colorScheme='white' size='sm' className='px-2 py-1'>
                      <Text size='sm'>{req.securityLevel}</Text>
                    </ValueCard>
                  </div>
                ))}
              </div>
              <Text size='sm' className='text-gray-600'>
                You need to add a private key with the above requirements to register a username.
              </Text>
            </ValueCard>
          </div>
          )
        : (
          <div className='flex flex-col gap-6 flex-grow'>
            <div className='flex justify-center'>
              <NameBlock />
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
                {currentIdentity}
              </Identifier>
            </div>
          </div>
          )}

      <div className='flex flex-col gap-4 w-full mt-6'>
        {currentStep === 1
          ? (
            <UsernameStep
              username={username}
              isContested={isContested}
              isValid={isValid}
              isAvailable={isAvailable}
              isCheckingAvailability={isCheckingAvailability}
              hasSufficientBalance={hasSufficientBalance}
              isCheckingBalance={isCheckingBalance}
              hasCompatibleKeys={hasCompatibleKeys}
              onRequestUsername={() => setCurrentStep(2)}
            />
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
