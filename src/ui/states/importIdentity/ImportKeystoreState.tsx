import React, { useEffect, useState } from 'react'
import { useSdk } from '../../hooks/useSdk'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Button,
  Text,
  Identifier,
  ValueCard,
  BigNumber,
  Input,
  Heading,
  DashLogo,
  ProgressStepBar,
  EyeClosedIcon,
  EyeOpenIcon,
  DeleteIcon
} from 'dash-ui/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { PrivateKeyWASM, IdentityWASM, IdentityPublicKeyWASM } from 'pshenmic-dpp'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { WalletType } from '../../../types/WalletType'

interface OutletContext {
  selectedNetwork: string | null
  setSelectedNetwork: (network: string | null) => void
  selectedWallet: string | null
  currentIdentity: string | null
  setCurrentIdentity: (identity: string | null) => void
}

interface PrivateKeyInput {
  id: string
  value: string
  isVisible: boolean
}

function ImportKeystoreState (): React.JSX.Element {
  const navigate = useNavigate()
  const sdk = useSdk()
  const { selectedNetwork } = useOutletContext<OutletContext>()

  const extensionAPI = useExtensionAPI()
  const [privateKeyInputs, setPrivateKeyInputs] = useState<PrivateKeyInput[]>([
    { id: Date.now().toString(), value: '', isVisible: false }
  ])
  const [identities, setIdentities] = useState<Array<{ key: PrivateKeyWASM, identity: IdentityWASM, balance: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const addPrivateKeyInput = (): void => {
    const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setPrivateKeyInputs(prev => [...prev, { id: newId, value: '', isVisible: false }])
  }

  const removePrivateKeyInput = (id: string): void => {
    if (privateKeyInputs.length > 1) {
      setPrivateKeyInputs(prev => prev.filter(input => input.id !== id))
    }
  }

  const updatePrivateKeyInput = (id: string, value: string): void => {
    setPrivateKeyInputs(prev =>
      prev.map(input => input.id === id ? { ...input, value } : input)
    )
  }

  const togglePrivateKeyVisibility = (id: string): void => {
    setPrivateKeyInputs(prev =>
      prev.map(input => input.id === id ? { ...input, isVisible: !input.isVisible } : input)
    )
  }

  const checkPrivateKeys = async (): Promise<void> => {
    setError(null)
    setIsLoading(true)

    try {
      const validIdentities: Array<{ key: PrivateKeyWASM, identity: IdentityWASM, balance: string }> = []

      // Filter out empty private key inputs
      const nonEmptyInputs = privateKeyInputs.filter(input => input.value?.trim() !== '')

      if (nonEmptyInputs.length === 0) {
        return setError('Please enter at least one private key')
      }

      for (const input of nonEmptyInputs) {
        const privateKey = input.value?.trim() || ''
        let pkeyWASM: PrivateKeyWASM | null = null

        if (privateKey.length === 52) {
          // wif
          try {
            pkeyWASM = PrivateKeyWASM.fromWIF(privateKey)
          } catch (e) {
            console.log(e)
            return setError(`Could not decode private key from WIF: ${privateKey}`)
          }
        } else if (privateKey.length === 64) {
          // hex
          try {
            pkeyWASM = PrivateKeyWASM.fromHex(privateKey, (selectedNetwork ?? 'testnet') as 'testnet' | 'mainnet')
          } catch (e) {
            console.log(e)
            return setError(`Could not decode private key from hex: ${privateKey}`)
          }
        } else {
          return setError('Unrecognized private key format')
        }

        if (pkeyWASM == null) {
          return setError(`Failed to process private key: ${privateKey}`)
        }

        let uniqueIdentity
        try {
          uniqueIdentity = await sdk.identities.getIdentityByPublicKeyHash(pkeyWASM.getPublicKeyHash())
        } catch (e) {
          // Continue to check non-unique
        }

        let nonUniqueIdentity
        try {
          nonUniqueIdentity = await sdk.identities.getIdentityByNonUniquePublicKeyHash(pkeyWASM.getPublicKeyHash())
        } catch (e) {
          // Continue
        }

        const [identity] = [uniqueIdentity, nonUniqueIdentity].filter(e => e != null)

        if (identity == null) {
          return setError(`Could not find identity belonging to private key: ${privateKey}`)
        }

        const [identityPublicKey] = identity.getPublicKeys()
          .filter((publicKey: IdentityPublicKeyWASM) =>
            publicKey.getPublicKeyHash() === pkeyWASM?.getPublicKeyHash() &&
              publicKey.purpose === 'AUTHENTICATION' &&
              publicKey.securityLevel === 'HIGH')

        if (identityPublicKey == null) {
          return setError(`Please use a key with purpose AUTHENTICATION and security level HIGH: ${privateKey}`)
        }

        // Get identifier as base58 string directly from IdentifierWASM
        const identifierString = identity.id.base58()
        const balance = await sdk.identities.getIdentityBalance(identifierString)

        validIdentities.push({
          key: pkeyWASM,
          identity,
          balance: balance.toString()
        })
      }

      setIdentities(validIdentities)
    } catch (e) {
      if (typeof e === 'string') {
        return setError(e)
      }

      setError(e?.toString() ?? 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (error != null) {
      setError(null)
    }
  }, [privateKeyInputs])

  const importIdentities = (): void => {
    const run = async (): Promise<void> => {
      if (identities.length === 0) {
        return setError('No identities found to import')
      }

      const { walletId } = await extensionAPI.createWallet(WalletType.keystore)
      await extensionAPI.switchWallet(walletId, selectedNetwork ?? 'testnet')

      // Get all private keys as hex
      const privateKeys = identities.map(({ key }) => key.hex())

      // Use the first identity's identifier for the import
      const identifier = identities[0].identity.id.base58()

      await extensionAPI.importIdentity(identifier, privateKeys)

      void navigate('/wallet-created')
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
    checkPrivateKeys().catch(console.warn)
  }

  const hasValidKeys = privateKeyInputs.some(input => input.value?.trim() !== '')

  return (
    <div className='flex flex-col gap-2 flex-1 -mt-16 pb-2'>
      <div className='flex flex-col gap-2.5 mb-6'>
        <DashLogo containerSize='3rem' />

        <Heading level={1} size='2xl'>Import Private Keys</Heading>

        {identities.length === 0 &&
          <div className='!leading-tight'>
            <Text size='sm' dim>
              Add more Private Keys to your wallet.
            </Text>
          </div>}
      </div>

      {identities.length === 0 &&
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
                      style={{
                        paddingRight: input.value
                          ? (privateKeyInputs.length > 1 ? '4.5rem' : '2.5rem')
                          : undefined
                      }}
                    />
                    {input.value && (
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
                      disabled={!input.value?.trim()}
                      className={`flex items-center justify-center w-14 h-14 rounded-2xl border border-gray-200 ${
                        input.value?.trim()
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
        </div>}

      {/* Identities Preview */}
      {identities.length > 0 &&
        <div className='flex flex-col gap-[0.875rem] mb-2.5'>
          <Text dim>
            We found {identities.length} identit{identities.length === 1 ? 'y' : 'ies'} associated with the given private key{identities.length === 1 ? '' : 's'}
          </Text>

          {identities.map((item, index) => {
            return (
              <ValueCard key={index} colorScheme='lightBlue'>
                <div className='flex flex-col gap-[0.875rem]'>
                  <div className='flex flex-col gap-[0.125rem]'>
                    <Text size='md' dim>Identifier</Text>
                    <ValueCard colorScheme='white'>
                      <Identifier
                        highlight='both'
                        copyButton
                        ellipsis={false}
                        linesAdjustment={false}
                      >
                        {item.identity.id.base58()}
                      </Identifier>
                    </ValueCard>
                  </div>
                  <div className='flex flex-col gap-[0.125rem]'>
                    <Text dim>Balance</Text>

                    <span>
                      <Text size='xl' weight='bold' monospace>
                        <BigNumber>
                          {item.balance}
                        </BigNumber>
                      </Text>
                      <Text
                        size='lg'
                        className='ml-2'
                      >
                        Credits
                      </Text>
                    </span>
                  </div>
                </div>
              </ValueCard>
            )
          }
          )}

          <Button
            colorScheme='brand'
            disabled={isLoading}
            className='w-full'
            onClick={() => importIdentities()}
          >
            {isLoading ? 'Importing...' : 'Import'}
          </Button>
        </div>}

        {error != null &&
          <ValueCard colorScheme='yellow' className='break-all'>
            <Text color='red'>{error}</Text>
          </ValueCard>}

      {/* Progress Steps */}
      <div className='mt-auto'>
        <ProgressStepBar currentStep={identities.length === 0 ? 3 : 4} totalSteps={4} />
      </div>
    </div>
  )
}

export default withAccessControl(ImportKeystoreState, {
  requireWallet: false
})
