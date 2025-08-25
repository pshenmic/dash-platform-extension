import React, { useState, useEffect } from 'react'
import { Text, Button, ValueCard, Identifier } from 'dash-ui/react'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import { PrivateKeyInput, PrivateKeyInputData } from '../../keys'
import { processPrivateKey, ProcessedPrivateKey } from '../../../../utils'
import { Network } from '../../../../types/enums/Network'
import { useSdk } from '../../../hooks/useSdk'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { useOutletContext } from 'react-router-dom'
import type { OutletContext } from '../../../types/OutletContext'

export const importPrivateKeysScreenConfig: ScreenConfig = {
  id: 'import-private-keys-settings',
  title: 'Import Private Keys',
  category: 'wallet',
  content: [] // Content will be generated dynamically
}

export const ImportPrivateKeysScreen: React.FC<SettingsScreenProps> = ({ currentIdentity, onBack }) => {
  const sdk = useSdk()
  const extensionAPI = useExtensionAPI()
  const { selectedNetwork } = useOutletContext<OutletContext>()

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

  const validateAndImportKeys = async (): Promise<void> => {
    setError(null)
    setIsLoading(true)
    setSuccessMessage(null)

    if (!currentIdentity) {
      setError('No current identity found. Please select an identity first.')
      setIsLoading(false)
      return
    }

    try {
      const validProcessedKeys: ProcessedPrivateKey[] = []
      const invalidInputIds: string[] = []
      
      // Filter out empty private key inputs
      const nonEmptyInputs = privateKeyInputs.filter(input => input.value?.trim() !== '')

      if (nonEmptyInputs.length === 0) {
        return setError('Please enter at least one private key')
      }

      // Process all keys and collect errors
      for (const input of nonEmptyInputs) {
        const privateKeyString = input.value.trim()
        
        try {
          const currentNetwork = selectedNetwork as Network || Network.testnet
          const processed = await processPrivateKey(privateKeyString, sdk, currentNetwork)
          
          // Check if the processed key belongs to the current identity
          const keyIdentityId = processed.identity.id.base58()
          if (keyIdentityId !== currentIdentity) {
            invalidInputIds.push(input.id)
          } else {
            validProcessedKeys.push(processed)
          }
        } catch (e) {
          invalidInputIds.push(input.id)
        }
      }

      // Mark invalid inputs with error state
      if (invalidInputIds.length > 0) {
        setPrivateKeyInputs(prev =>
          prev.map(input => ({
            ...input,
            hasError: invalidInputIds.includes(input.id)
          }))
        )

        // Don't set general error when we have field-specific errors
        // The error message will be displayed based on hasError flags
        setIsLoading(false)
        return
      }

      // If we get here, all keys belong to the current identity - import them
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

      if (!currentIdentity) {
        return setError('No current identity found')
      }

      // Add each private key to the current identity
      for (const { key } of keys) {
        await extensionAPI.addIdentityPrivateKey(currentIdentity, key.hex())
      }

      // Show success message and navigate back to Private Keys screen
      setSuccessMessage(`Successfully imported ${keys.length} private key${keys.length === 1 ? '' : 's'} to the current identity!`)
      
      // Reset form
      setPrivateKeyInputs([{ id: Date.now().toString(), value: '', isVisible: false, hasError: false }])
      
      // Navigate back to Private Keys screen after a short delay
      setTimeout(() => {
        onBack?.()
      }, 2000)
      
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      setError(errorMessage)
    }
  }

  const resetForm = (): void => {
    setError(null)
    setSuccessMessage(null)
    setPrivateKeyInputs([{ id: Date.now().toString(), value: '', isVisible: false, hasError: false }])
  }

  // Clear error and success message when inputs change
  useEffect(() => {
    if (error != null) {
      setError(null)
    }
    if (successMessage != null) {
      setSuccessMessage(null)
    }
  }, [privateKeyInputs])

  const hasValidKeys = privateKeyInputs.some(input => input.value?.trim() !== '')

  return (
    <div className='space-y-4'>
      {/* Description */}
      <div className='px-4'>
        <Text size='sm' dim>
          Add more Private Keys to your identity:
        </Text>
        {currentIdentity && (
          <Identifier
            key={currentIdentity}
            middleEllipsis
            edgeChars={8}
            highlight='both'
            avatar={true}
          >
            {currentIdentity}
          </Identifier>
        )}
      </div>

      {/* Success Message */}
      {successMessage != null && (
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
        {(error != null || privateKeyInputs.some(input => input.hasError)) && (
          <ValueCard colorScheme='yellow' className='break-all'>
            <Text color='red'>
              {privateKeyInputs.some(input => input.hasError) ? (
                privateKeyInputs.filter(input => input.value?.trim() !== '').length === 1
                  ? 'Key belongs to another identity'
                  : 'Some of the keys belong to another identity'
              ) : error}
            </Text>
          </ValueCard>
        )}

        {/* Import Button */}
        <Button
          colorScheme='brand'
          disabled={!hasValidKeys || isLoading || !currentIdentity}
          className='w-full'
          onClick={validateAndImportKeys}
        >
          {isLoading ? 'Importing...' : 'Import Private Keys'}
        </Button>
      </div>
    </div>
  )
}
