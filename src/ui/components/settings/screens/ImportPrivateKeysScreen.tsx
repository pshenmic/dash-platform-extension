import React, { useState, useEffect } from 'react'
import { Text, Button, ValueCard, Identifier } from 'dash-ui-kit/react'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import { PrivateKeyInput, PrivateKeyInputData } from '../../keys'
import { processPrivateKey, ProcessedPrivateKey } from '../../../../utils'
import { Network } from '../../../../types/enums/Network'
import { useSdk } from '../../../hooks/useSdk'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'

export const importPrivateKeysScreenConfig: ScreenConfig = {
  id: 'import-private-keys-settings',
  title: 'Import Private Keys',
  category: 'wallet',
  content: []
}

export const ImportPrivateKeysScreen: React.FC<SettingsScreenProps> = ({ currentIdentity, currentNetwork, onBack }) => {
  const sdk = useSdk()
  const extensionAPI = useExtensionAPI()

  const [privateKeyInputs, setPrivateKeyInputs] = useState<PrivateKeyInputData[]>([
    { id: Date.now().toString(), value: '', isVisible: false, hasError: false }
  ])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const addPrivateKeyInput = (): void => {
    const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setPrivateKeyInputs(prev => [...prev, { id: newId, value: '', isVisible: false, hasError: false }])
  }

  const removePrivateKeyInput = (id: string): void => {
    if (privateKeyInputs.length > 1) {
      setPrivateKeyInputs(prev => prev.filter(input => input.id !== id))
    }
  }

  const updatePrivateKeyInput = (id: string, value: string): void => {
    setPrivateKeyInputs(prev =>
      prev.map(input => input.id === id ? { ...input, value, hasError: false } : input)
    )
  }

  const togglePrivateKeyVisibility = (id: string): void => {
    setPrivateKeyInputs(prev =>
      prev.map(input => input.id === id ? { ...input, isVisible: !input.isVisible } : input)
    )
  }

  const setInputError = (inputId: string, hasError: boolean): void => {
    setPrivateKeyInputs(prev =>
      prev.map(input => input.id === inputId ? { ...input, hasError } : input)
    )
  }

  const validateAndImportKeys = async (): Promise<void> => {
    setError(null)
    setIsLoading(true)
    setSuccessMessage(null)
    setPrivateKeyInputs(prev => prev.map(input => ({ ...input, hasError: false })))

    if (currentIdentity === null || currentIdentity === '') {
      setError('No current identity found. Please select an identity first.')
      setIsLoading(false)
      return
    }

    try {
      const validProcessedKeys: ProcessedPrivateKey[] = []
      const invalidInputIds: string[] = []
      const nonEmptyInputs = privateKeyInputs.filter(input => input.value?.trim() !== '' && input.value?.trim() !== undefined)

      if (nonEmptyInputs.length === 0) {
        return setError('Please enter at least one private key')
      }

      for (const input of nonEmptyInputs) {
        const privateKeyString = input.value.trim()

        try {
          const network = (currentNetwork as Network) ?? Network.testnet
          const processed = await processPrivateKey(privateKeyString, sdk, network)

          // Check if the processed key belongs to the current identity
          const keyIdentityId = processed.identity.id.base58()
          if (keyIdentityId !== currentIdentity) {
            setInputError(input.id, true)
            invalidInputIds.push(input.id)
          } else {
            validProcessedKeys.push(processed)
          }
        } catch (e) {
          setInputError(input.id, true)
          invalidInputIds.push(input.id)
        }
      }

      // Set error message if there are invalid inputs
      if (invalidInputIds.length > 0) {
        const hasDecodingErrors = await Promise.all(
          nonEmptyInputs
            .filter(input => invalidInputIds.includes(input.id))
            .map(async input => {
              try {
                const network = (currentNetwork as Network) ?? Network.testnet
                await processPrivateKey(input.value.trim(), sdk, network)
                return false // No decoding error, key belongs to different identity
              } catch (e) {
                return true
              }
            })
        )

        const hasAnyDecodingErrors = hasDecodingErrors.some(hasError => hasError)
        
        if (hasAnyDecodingErrors) {
          setError('Could not decode private key from hex')
        } else {
          const errorMsg = invalidInputIds.length === 1
            ? 'Key belongs to another identity'
            : 'Some of the keys belong to another identity'
          setError(errorMsg)
        }

        setIsLoading(false)
        return
      }

      await importPrivateKeys(validProcessedKeys)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const importPrivateKeys = async (keys: ProcessedPrivateKey[]): Promise<void> => {
    try {
      if (keys.length === 0) {
        return setError('No private keys to import')
      }

      if (currentIdentity === null || currentIdentity === '') {
        return setError('No current identity found')
      }

      for (const { key } of keys) {
        if (currentIdentity != null) {
          await extensionAPI.addIdentityPrivateKey(currentIdentity, key.hex())
        }
      }
      setSuccessMessage(`Successfully imported ${keys.length} private key${keys.length === 1 ? '' : 's'} to the current identity!`)
      setPrivateKeyInputs([{ id: Date.now().toString(), value: '', isVisible: false, hasError: false }])
      onBack?.()
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      setError(errorMessage)
    }
  }

  // Clear error and success message when user types
  useEffect(() => {
    const hasValueChanges = privateKeyInputs.some(input => input.value !== '')
    if (hasValueChanges) {
      setError(null)
      setSuccessMessage(null)
    }
  }, [privateKeyInputs.map(input => input.value).join(',')])

  const hasValidKeys = privateKeyInputs.some(input => input.value?.trim() !== '' && input.value?.trim() !== undefined)

  return (
    <div className='space-y-4'>
      <div className='px-4'>
        <Text size='sm' dim>
          Add more Private Keys to your identity:
        </Text>
        {currentIdentity !== null && currentIdentity !== '' && (
          <Identifier
            key={currentIdentity}
            middleEllipsis
            edgeChars={8}
            highlight='both'
            avatar
          >
            {currentIdentity}
          </Identifier>
        )}
      </div>

      {/* Success Message */}
      {successMessage !== null && (
        <div className='px-4'>
          <ValueCard colorScheme='green' className='break-words whitespace-pre-wrap'>
            <Text color='green'>{successMessage}</Text>
          </ValueCard>
        </div>
      )}

      {/* Private Key Input Section */}
      <div className='px-4 space-y-4'>
        <div>
          <Text dim className='mb-2.5'>
            Private Key
          </Text>

          <div className='space-y-2.5'>
            {privateKeyInputs.map((input, index) => (
              <PrivateKeyInput
                key={input.id}
                input={input}
                placeholder='Paste your Key'
                showAddButton={index === privateKeyInputs.length - 1}
                canDelete={privateKeyInputs.length > 1}
                onValueChange={updatePrivateKeyInput}
                onVisibilityToggle={togglePrivateKeyVisibility}
                onDelete={removePrivateKeyInput}
                onAdd={addPrivateKeyInput}
              />
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error !== null && (
          <ValueCard colorScheme='yellow' className='break-all'>
            <Text color='red'>{error}</Text>
          </ValueCard>
        )}

        {/* Import Button */}
        <Button
          colorScheme='brand'
          disabled={!hasValidKeys || isLoading || currentIdentity === null || currentIdentity === ''}
          className='w-full'
          onClick={validateAndImportKeys}
        >
          {isLoading ? 'Importing...' : 'Import Private Keys'}
        </Button>
      </div>
    </div>
  )
}
