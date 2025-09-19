import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { UsernameInput } from '../../components/forms'
import { Text, Identifier } from 'dash-ui-kit/react'
import type { LayoutContext } from '../../components/layout/Layout'
import { useAsyncState, useSdk, usePlatformExplorerClient, useExtensionAPI, useSigningKeys } from '../../hooks'
import { NetworkType } from '../../../types'
import { UsernameStep } from './UsernameStep'
import { ConfirmationStep } from './ConfirmationStep'
import type { KeyRequirement } from '../../components/keys'
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
    identity: currentStep === 2 ? currentIdentity : null
  })
  const [rateState, loadRate] = useAsyncState<number>()
  const platformClient = usePlatformExplorerClient()

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setIsValid(value.length >= 3 && /^[a-zA-Z0-9_-]+$/.test(value))
  }

  const registerName = async () => {
    if (!currentIdentity || !username || !selectedSigningKey || isRegistering) {
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

      if (!selectedSigningKey) {
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

      navigate('/home')
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
      const result = await platformClient.fetchRate(currentNetwork as NetworkType)
      if (result.data !== null && result.data !== undefined) {
        return result.data
      }
      throw new Error(result.error ?? 'Failed to load rate')
    }).catch(e => console.log('loadRate error:', e))
  }, [currentNetwork, platformClient, loadRate])

  useEffect(() => {
    if (username) {
      try {
        const fullName = username.includes('.dash') ? username : `${username}.dash`
        const contested = sdk.names.testNameContested(fullName)
        setIsContested(contested)
      } catch (error) {
        console.log('Error checking contested name:', error)
        setIsContested(false)
      }
    } else {
      setIsContested(false)
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
  }, [currentStep, username, handleUsernameChange])

  return (
    <div className='flex flex-col h-full min-h-max'>
      <TitleBlock
        title={<>{currentStep === 1 ? 'Create' : 'Confirm'} your<br/>Dash Username</>}
        description={currentStep === 1
          ? 'You will not be able to change it in the future'
          : `You have chosen ${username} as your username. Please note that you can\'t change your name once it is registered.`}
        showLogo={false}
      />

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
      <div className='flex flex-col gap-4 w-full mt-6'>
        {currentStep === 1 ? (
          <UsernameStep
            username={username}
            isContested={isContested}
            isValid={isValid}
            onRequestUsername={() => setCurrentStep(2)}
          />
        ) : (
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
            onConfirm={registerName}
            onPasswordChange={(value: string) => setPassword(value)}
            onSigningKeyChange={(keyId: string) => setSelectedSigningKey(keyId)}
          />
        )}
      </div>
    </div>
  )
}

export default NameRegistrationState
