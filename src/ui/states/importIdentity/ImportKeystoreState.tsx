import React, { useEffect, useState } from 'react'
import { useSdk } from '../../hooks/useSdk'
import { useNavigate, useOutletContext } from 'react-router-dom'
import type { OutletContext } from '../../types/OutletContext'
import {
  Button,
  Text,
  ValueCard,
  Input,
  Heading,
  DashLogo,
  EyeClosedIcon,
  EyeOpenIcon,
  DeleteIcon
} from 'dash-ui-kit/react'
import { useExtensionAPI } from '../../hooks'
import { processPrivateKey, ProcessedPrivateKey } from '../../../utils'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { WalletType, NetworkType } from '../../../types'
import { IdentityPreview } from '../../components/Identities'
import { PrivateKeyWASM, IdentityWASM } from 'pshenmic-dpp'

interface PrivateKeyInput {
  id: string
  value: string
  isVisible: boolean
  hasError?: boolean
}

function ImportKeystoreState (): React.JSX.Element {
  const navigate = useNavigate()
  const sdk = useSdk()
  const { currentNetwork, currentWallet, setCurrentIdentity } = useOutletContext<OutletContext>()

  const extensionAPI = useExtensionAPI()
  const [privateKeyInputs, setPrivateKeyInputs] = useState<PrivateKeyInput[]>([
    { id: Date.now().toString(), value: '', isVisible: false, hasError: false }
  ])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<{
    identity: {
      id: string
      name?: string
      balance: string
      publicKeys: Array<{
        keyId: number
        purpose: string
        securityLevel: string
        type: string
        isAvailable: boolean
      }>
    }
    validKeys: Array<{ key: PrivateKeyWASM, identity: IdentityWASM, balance: string }>
  } | null>(null)

  // Check if selected wallet is keystore type
  useEffect(() => {
    const checkWalletType = async (): Promise<void> => {
      if (currentWallet === null) {
        void navigate('/choose-wallet-type')
        return
      }

      try {
        const wallets = await extensionAPI.getAllWallets()
        const currentWalletInfo = wallets.find(wallet => wallet.walletId === currentWallet)

        if (currentWalletInfo === null || currentWalletInfo === undefined || currentWalletInfo?.type !== WalletType.keystore) {
          void navigate('/choose-wallet-type')
        }
      } catch (error) {
        console.log('Failed to check wallet type:', error)
        void navigate('/choose-wallet-type')
      }
    }

    void checkWalletType().catch(error => {
      console.log('Failed to check wallet type in effect:', error)
    })
  }, [currentWallet, extensionAPI, navigate])

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

  const checkPrivateKeys = async (): Promise<void> => {
    setError(null)
    setIsLoading(true)
    setPrivateKeyInputs(prev => prev.map(input => ({ ...input, hasError: false })))

    try {
      const validIdentities: ProcessedPrivateKey[] = []
      const invalidInputIds: string[] = []

      // Filter out empty private key inputs
      const nonEmptyInputs = privateKeyInputs.filter(input => input.value?.trim() !== '' && input.value?.trim() !== undefined)

      if (nonEmptyInputs.length === 0) {
        return setError('Please enter at least one private key')
      }

      for (const input of nonEmptyInputs) {
        const privateKeyString = input.value.trim()

        try {
          const network = currentNetwork as NetworkType
          const processed = await processPrivateKey(privateKeyString, sdk, network)
          validIdentities.push(processed)
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
                const network = currentNetwork as NetworkType
                await processPrivateKey(input.value.trim(), sdk, network)
                return false // No decoding error
              } catch (e) {
                return true
              }
            })
        )

        const hasAnyDecodingErrors = hasDecodingErrors.some(hasError => hasError)

        if (hasAnyDecodingErrors) {
          setError('Invalid private key')
        } else {
          setError('Could not find identity belonging to private key')
        }

        setIsLoading(false)
        return
      }

      // Show preview with first identity data
      if (validIdentities.length > 0) {
        const [firstIdentityData] = validIdentities
        const firstIdentity = firstIdentityData.identity
        const identityId = firstIdentity.id.base58()

        // Get all public keys from identity
        const allPublicKeys = firstIdentity.getPublicKeys()
        const availableKeyIds = validIdentities.map(({ key }) => {
          const publicKey = firstIdentity.getPublicKeys().find((ipk: any) =>
            ipk.getPublicKeyHash() === key.getPublicKeyHash()
          )
          return (publicKey != null) ? publicKey.keyId : null
        }).filter(id => id !== null)

        const publicKeysData = allPublicKeys.map((publicKey: any) => {
          const keyId = publicKey.keyId
          const purpose = String(publicKey.purpose ?? 'UNKNOWN')
          const securityLevel = String(publicKey.securityLevel ?? 'UNKNOWN')
          const keyType = String(publicKey.keyType ?? 'UNKNOWN')

          return {
            keyId,
            purpose,
            securityLevel,
            type: keyType,
            isAvailable: availableKeyIds.includes(keyId)
          }
        })

        setPreviewData({
          identity: {
            id: identityId,
            balance: validIdentities[0].balance,
            publicKeys: publicKeysData
          },
          validKeys: validIdentities
        })
        setShowPreview(true)
      }
    } catch (e) {
      if (typeof e === 'string') {
        return setError(e)
      }

      setError(e?.toString() ?? 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Clear error only when user types in input
  useEffect(() => {
    const hasValueChanges = privateKeyInputs.some(input => input.value !== '')
    if (hasValueChanges) {
      setError(null)
    }
  }, [privateKeyInputs.map(input => input.value).join(',')])

  useEffect(() => {
    setShowPreview(false)
    setPreviewData(null)
  }, [privateKeyInputs])

  const confirmImport = (): void => {
    if (previewData == null) return

    importIdentities(previewData.validKeys)
  }

  const importIdentities = (identitiesToImport: ProcessedPrivateKey[]): void => {
    const run = async (): Promise<void> => {
      if (identitiesToImport.length === 0) {
        return setError('No identities found to import')
      }

      if (currentWallet === null) {
        return setError('No wallet selected')
      }

      // Get all private keys as hex
      const privateKeys = identitiesToImport.map(({ key }) => key.hex())

      // Use the first identity's identifier for the import
      const identifier = identitiesToImport[0].identity.id.base58()

      await extensionAPI.importIdentity(identifier, privateKeys)
      setCurrentIdentity(identifier)

      void navigate('/home')
    }

    setIsLoading(true)
    setError(null)

    run()
      .catch(e => {
        setError((e)?.message ?? e?.toString() ?? 'Unknown error')
      })
      .finally(() => setIsLoading(false))
  }

  const handleCheckClick = (): void => {
    checkPrivateKeys().catch(console.log)
  }

  const hasValidKeys = privateKeyInputs.some(input => input.value?.trim() !== '' && input.value?.trim() !== undefined)

  // Show preview if available
  if (showPreview && (previewData != null)) {
    return (
      <div className='flex flex-col gap-2 flex-1 -mt-16 pb-2'>
        <div className='flex flex-col gap-2.5 mb-6'>
          <DashLogo containerSize='3rem' />

          <Heading level={1} size='2xl'>Import your Identity</Heading>

          <div className='!leading-tight'>
            <Text size='sm' dim>
              Carefully check all the imported private keys and continue.
            </Text>
          </div>
        </div>

        {/* Identity Preview */}
        <div className='mb-6'>
          <IdentityPreview identity={previewData.identity} />
        </div>

        <Button
          disabled={isLoading}
          className='w-full h-[3.625rem]'
          onClick={confirmImport}
        >
          Import Identity
        </Button>

        {error !== null &&
          <ValueCard colorScheme='yellow' className='break-all'>
            <Text color='red'>{error}</Text>
          </ValueCard>}
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-2 flex-1 -mt-16 pb-2'>
      <div className='flex flex-col gap-2.5 mb-6'>
        <DashLogo containerSize='3rem' />

        <Heading level={1} size='2xl'>Import Private Keys</Heading>

        <div className='!leading-tight'>
          <Text size='sm' dim>
            Add more Private Keys to your wallet.
          </Text>
        </div>
      </div>

      <div className='flex flex-col gap-[0.875rem]'>
        <div className='mb-6'>
          <Text dim>
            Private Key
          </Text>

          <div className='flex flex-col gap-2.5'>
            {privateKeyInputs.map((input, index) => (
              <div key={input.id} className='flex gap-2.5'>
                <div className='flex-1 relative'>
                  <Input
                    placeholder='Paste your Key'
                    value={input.value}
                    onChange={(e) => updatePrivateKeyInput(input.id, e.target.value)}
                    type={input.isVisible ? 'text' : 'password'}
                    size='xl'
                    showPasswordToggle={false}
                    error={input.hasError}
                    style={{
                      paddingRight: input.value !== '' && input.value !== undefined
                        ? (privateKeyInputs.length > 1 ? '4.5rem' : '2.5rem')
                        : undefined
                    }}
                  />
                  {input.value !== '' && input.value !== undefined && (
                    <div className='absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1'>
                      <button
                        onClick={() => togglePrivateKeyVisibility(input.id)}
                        className='p-1 hover:bg-gray-100 rounded'
                        type='button'
                      >
                        {input.isVisible
                          ? <EyeClosedIcon className='text-dash-primary-dark-blue' />
                          : <EyeOpenIcon className='text-dash-primary-dark-blue' />}
                      </button>
                      {privateKeyInputs.length > 1 && (
                        <button
                          onClick={() => removePrivateKeyInput(input.id)}
                          className='p-1 hover:bg-gray-100 rounded'
                          type='button'
                        >
                          <DeleteIcon />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {index === privateKeyInputs.length - 1 && (
                  <button
                    onClick={addPrivateKeyInput}
                    disabled={input.value?.trim() === '' || input.value?.trim() === undefined}
                    className={`flex items-center justify-center w-14 h-14 rounded-2xl border border-gray-200 ${
                      input.value?.trim() !== '' && input.value?.trim() !== undefined
                        ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
                        : 'bg-gray-25 cursor-not-allowed opacity-50'
                    }`}
                    type='button'
                  >
                    <Text size='xl' weight='medium'>+</Text>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <Button
            colorScheme='brand'
            disabled={!hasValidKeys || isLoading}
            className='w-full'
            onClick={handleCheckClick}
          >
            {isLoading ? 'Checking...' : 'Check'}
          </Button>
        </div>
      </div>


      {error !== null &&
        <ValueCard colorScheme='yellow' className='break-all'>
          <Text color='red'>{error}</Text>
        </ValueCard>}
    </div>
  )
}

export default withAccessControl(ImportKeystoreState, {
  requireWallet: false
})
