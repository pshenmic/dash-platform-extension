import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { UsernameInput } from '../../components/forms'
import { Text, Identifier } from 'dash-ui-kit/react'
import type { LayoutContext } from '../../components/layout/Layout'
import { useAsyncState, useSdk, usePlatformExplorerClient, useExtensionAPI } from '../../hooks'
import { NetworkType } from '../../../types'
import { PublicKeyInfo } from '../../components/keys'
import { UsernameStep } from './UsernameStep'
import { ConfirmationStep } from './ConfirmationStep'
type Step = 1 | 2

const NameRegistrationState: React.FC = () => {
  const sdk = useSdk()
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const { currentNetwork, currentIdentity } = useOutletContext<LayoutContext>()
  const [username, setUsername] = useState('')
  const [isContested, setIsContested] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [password, setPassword] = useState<string>('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [selectedSigningKey, setSelectedSigningKey] = useState<string | null>(null)
  const [signingKeys, setSigningKeys] = useState<PublicKeyInfo[]>([])
  const [signingKeysState, loadSigningKeys] = useAsyncState<PublicKeyInfo[]>()
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

      // Navigate back to home on success
      navigate('/home')
    } catch (error) {
      console.error('Failed to register username:', error)
      const errorMessage = error instanceof Error ? error.message : (String(error) ?? 'Unknown error occurred')
      setRegistrationError(errorMessage)
    } finally {
      setIsRegistering(false)
    }

    setIsRegistering(false)
  }

  // Load signing keys when moving to step 2
  useEffect(() => {
    if (currentStep !== 2 || currentNetwork == null || currentIdentity == null) return

    loadSigningKeys(async () => {
      const identityPublicKeys = await sdk.identities.getIdentityPublicKeys(currentIdentity)
      const availableKeyIds = await extensionAPI.getAvailableKeyPairs(currentIdentity)

      // Filter identity public keys to only show those that are available
      const availablePublicKeys = identityPublicKeys.filter((key: any) => {
        const keyId = key?.keyId ?? key?.getId?.() ?? null
        return keyId != null && availableKeyIds.includes(keyId)
      })

      const keys: PublicKeyInfo[] = availablePublicKeys.map((key: any) => {
        const keyId = key?.keyId ?? key?.getId?.() ?? null
        const purpose = String(key?.purpose ?? 'UNKNOWN')
        const security = String(key?.securityLevel ?? 'UNKNOWN')
        let hash = ''
        try {
          hash = typeof key?.getPublicKeyHash === 'function' ? key.getPublicKeyHash() : ''
        } catch {}

        return {
          keyId: keyId ?? 0,
          securityLevel: security,
          purpose,
          hash
        }
      })

      return keys
    })
      .catch(e => console.log('loadSigningKeys error', e))
  }, [currentStep, currentNetwork, currentIdentity, sdk, extensionAPI, loadSigningKeys])

  // Update local state when signing keys are loaded
  useEffect(() => {
    if (signingKeysState.data != null) {
      setSigningKeys(signingKeysState.data)

      if (signingKeysState.data.length > 0 && selectedSigningKey === null) {
        const firstKey = signingKeysState.data[0]
        const keyValue = firstKey.keyId?.toString() ?? (firstKey.hash !== '' ? firstKey.hash : 'key-0')
        setSelectedSigningKey(keyValue)
      }

      return
    }

    setSigningKeys([])

    if (selectedSigningKey !== null) {
      setSelectedSigningKey(null)
    }
  }, [signingKeysState.data, selectedSigningKey])

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
            signingKeysLoading={signingKeysState.loading}
            signingKeysError={signingKeysState.error}
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
