import React, { useEffect, useState } from 'react'
import { useSdk } from '../../hooks/useSdk'
import { useNavigate } from 'react-router-dom'
import { Button, Text, NotActive, Identifier, ValueCard, BigNumber, Textarea } from 'dash-ui/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { PrivateKeyWASM, IdentityWASM, IdentityPublicKeyWASM } from 'pshenmic-dpp'
import { withAccessControl } from '../../components/auth/withAccessControl'
import LoadingScreen from '../../components/layout/LoadingScreen'

function ImportIdentityState (): React.JSX.Element {
  const navigate = useNavigate()
  const sdk = useSdk()

  const extensionAPI = useExtensionAPI()
  const [privateKey, setPrivateKey] = useState('')
  const [privateKeyWASM, setPrivateKeyWASM] = useState<PrivateKeyWASM | null>(null)
  const [identity, setIdentity] = useState<IdentityWASM | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingWallet, setIsCheckingWallet] = useState(true)

  // Check if wallet exists on component mount
  useEffect(() => {
    const checkWallet = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()
        if (status.currentWalletId == null || status.currentWalletId === '') {
          void navigate('/create-wallet')
          return
        }
        setIsCheckingWallet(false)
      } catch (error) {
        console.warn('Failed to check wallet status:', error)
        void navigate('/create-wallet')
      }
    }

    void checkWallet()
  }, [extensionAPI, navigate])

  const checkPrivateKey = async (): Promise<void> => {
    setError(null)
    setIsLoading(true)

    try {
      let pkeyWASM: PrivateKeyWASM | null = null

      if (privateKey.length === 52) {
      // wif
        try {
          pkeyWASM = PrivateKeyWASM.fromWIF(privateKey)
          setPrivateKeyWASM(pkeyWASM)
        } catch (e) {
          console.log(e)
          return setError('Could not decode private key from WIF')
        }
      } else if (privateKey.length === 64) {
      // hex
        try {
          pkeyWASM = PrivateKeyWASM.fromHex(privateKey, 'testnet')
          setPrivateKeyWASM(pkeyWASM)
        } catch (e) {
          console.log(e)
          return setError('Could not decode private key from hex')
        }
      } else {
        return setError('Unrecognized private key format')
      }

      if (pkeyWASM == null) {
        setIsLoading(false)
        return setError('Failed to process private key')
      }

      let uniqueIdentity

      try {
        uniqueIdentity = await sdk.identities.getIdentityByPublicKeyHash(pkeyWASM.getPublicKeyHash())
      } catch (e) {
      }

      let nonUniqueIdentity

      try {
        nonUniqueIdentity = await sdk.identities.getIdentityByNonUniquePublicKeyHash(pkeyWASM.getPublicKeyHash())
      } catch (e) {
      }

      const [identity] = [uniqueIdentity, nonUniqueIdentity].filter(e => e != null)

      if (identity == null) {
        return setError('Could not find identity belonging to this private key')
      }

      const [identityPublicKey] = identity.getPublicKeys()
        .filter((publicKey: IdentityPublicKeyWASM) =>
          publicKey.getPublicKeyHash() === pkeyWASM?.getPublicKeyHash() &&
            publicKey.purpose === 'AUTHENTICATION' &&
            publicKey.securityLevel === 'HIGH')

      if (identityPublicKey == null) {
        return setError('Please use a key with purpose AUTHENTICATION and security level HIGH')
      }

      // Get identifier as base58 string directly from IdentifierWASM
      const identifierString = identity.id.base58()
      const balance = await sdk.identities.getIdentityBalance(identifierString)

      setIdentity(identity)
      setBalance(balance.toString())
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
  }, [privateKey])

  const importIdentity = (): void => {
    const run = async (): Promise<void> => {
      // Prepare data for CREATE_IDENTITY
      if (identity == null) {
        return setError('Could not load identity')
      }

      if (privateKeyWASM == null) {
        return setError('Could not load private key')
      }

      const identifier = identity.id.base58()

      const privateKeyHex = privateKey.length === 64 ? privateKey : privateKeyWASM.hex()

      const privateKeys = [privateKeyHex]

      await extensionAPI.importIdentity(identifier, privateKeys)

      void navigate('/')
    }

    setIsLoading(true)
    setError(null)

    run()
      .catch(e => {
        console.warn(e)

        // Check if it's a wallet not found error
        if ((e)?.message?.includes('Wallet not found') === true) {
          // Redirect to wallet creation
          void navigate('/create-wallet')
          return
        }

        setError((e)?.message ?? e?.toString() ?? 'Unknown error')
      })
      .finally(() => setIsLoading(false))
  }

  const handleCheckClick = (): void => {
    checkPrivateKey().catch(console.warn)
  }

  // Show loading screen while checking wallet
  if (isCheckingWallet || isLoading) {
    return <LoadingScreen message={isCheckingWallet ? 'Checking wallet...' : 'Loading...'} />
  }

  return (
    <div className='flex flex-col gap-2'>
      <span className='h1-title'>Import your identity</span>

      {identity == null &&
        <div className='flex flex-col gap-[0.875rem]'>
          <div className='flex flex-col gap-2'>
            <Text color='blue' size='lg'>
              Paste your identity <Text size='lg'>Private Key</Text> in <Text size='lg'>HEX format</Text>
            </Text>
            <Text color='blue' size='lg'>
              You can export it from the Dash Evonode Tool application
            </Text>
          </div>

          <Textarea
            rows={3}
            placeholder='your private key...'
            onChange={setPrivateKey}
            size='xl'
          />

          {error != null &&
            <div className='py-1'>
              <span>{error}</span>
            </div>}

          <div>
            <Button
              colorScheme='brand'
              disabled={privateKey === '' || isLoading}
              className='w-full'
              onClick={handleCheckClick}
            >
              {isLoading ? 'Checking...' : 'Check'}
            </Button>
          </div>
        </div>}

      {identity != null &&
        <div className='flex flex-col gap-[0.875rem]'>
          <Text size='lg' color='blue'>
            We found an identity associated with the given private key
          </Text>

          <ValueCard colorScheme='lightBlue'>
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
                    {identity.id.base58()}
                  </Identifier>
                </ValueCard>
              </div>
              <div className='flex flex-col gap-[0.125rem]'>
                <Text dim>Balance</Text>

                <span>
                  {balance != null
                    ? (
                      <Text size='xl' weight='bold' monospace>
                        <BigNumber>
                          {balance}
                        </BigNumber>
                      </Text>
                      )
                    : <NotActive>N/A</NotActive>}
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
          <Button
            colorScheme='brand'
            disabled={privateKey === '' || isLoading}
            className='w-full'
            onClick={() => importIdentity()}
          >
            {isLoading ? 'Importing...' : 'Import'}
          </Button>
        </div>}
    </div>
  )
}

export default withAccessControl(ImportIdentityState)
