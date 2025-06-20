import React, { useEffect, useState } from 'react'
import { useSdk } from '../../hooks/useSdk'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/controls/buttons'
import Textarea from '../../components/form/Textarea'
import { ValueCard } from '../../components/containers/ValueCard'
import Identifier from '../../components/data/Identifier'
import BigNumber from '../../components/data/BigNumber'
import { NotActive } from '../../components/data/NotActive'
import Text from '../../text/Text'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { IdentityWASM } from 'pshenmic-dpp/dist/wasm'
import { withAuthCheck } from '../../components/auth/withAuthCheck'

function ImportIdentityState (): React.JSX.Element {
  const navigate = useNavigate()
  const sdk = useSdk()

  const extensionAPI = useExtensionAPI()
  const [privateKey, setPrivateKey] = useState('')
  const [privateKeyWASM, setPrivateKeyWASM] = useState<PrivateKeyWASM | null>(null)
  const [identity, setIdentity] = useState<IdentityWASM | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkPrivateKey = async (): Promise<void> => {
    const status = await extensionAPI.getStatus()
    console.log(status)
    setError(null)
    setIsLoading(true)

    // Check if DPP is available
    if (sdk.dpp?.PrivateKeyWASM == null) {
      setIsLoading(false)
      return setError('DPP module not available. Please try again.')
    }

    let pkeyWASM: PrivateKeyWASM | null = null

    if (privateKey.length === 52) {
      // wif
      try {
        pkeyWASM = sdk.dpp.PrivateKeyWASM.fromWIF(privateKey)
        setPrivateKeyWASM(pkeyWASM)
      } catch (e) {
        console.error(e)
        setIsLoading(false)
        return setError('Could not decode private key from WIF')
      }
    } else if (privateKey.length === 64) {
      // hex
      try {
        pkeyWASM = sdk.dpp.PrivateKeyWASM.fromHex(privateKey, 'testnet')
        setPrivateKeyWASM(pkeyWASM)
      } catch (e) {
        console.error(e)
        setIsLoading(false)
        return setError('Could not decode private key from hex')
      }
    } else {
      setIsLoading(false)
      return setError('Unrecognized private key format')
    }

    if (pkeyWASM == null) {
      setIsLoading(false)
      return setError('Failed to process private key')
    }

    try {
      const identity = await sdk.identities.getByPublicKeyHash(pkeyWASM.getPublicKeyHash())

      // TODO: if Purpose !== Authentication && Security Level !== High => error, does not fit

      // Get identifier as base58 string directly from IdentifierWASM
      const identifierString = identity.getId().base58()
      const balance = await sdk.identities.getBalance(identifierString)

      setIdentity(identity)
      setBalance(balance)
    } catch (e) {
      console.error(e)
      if (typeof e === 'string') {
        setIsLoading(false)
        return setError(e)
      }

      if ((e)?.code === 5) {
        setIsLoading(false)
        return setError('Identity related to this private key was not found')
      }

      setIsLoading(false)
      setError(e?.toString() ?? 'Unknown error')
    }

    setIsLoading(false)
  }

  useEffect(() => {
    if (error != null) {
      setError(null)
    }
  }, [privateKey])

  const importIdentity = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Prepare data for CREATE_IDENTITY
      if (identity == null) {
        return setError('Could not load identity')
      }

      if (privateKeyWASM == null) {
        return setError('Could not load private key')
      }

      const identifier = identity.getId().base58()

      // Convert private key to hex format
      let privateKeyHex
      if (privateKey.length === 64) {
        // Already hex format
        privateKeyHex = privateKey
      } else {
        // Convert from WIF to hex using the hex() method
        privateKeyHex = privateKeyWASM.hex()
      }

      const privateKeys = [privateKeyHex]

      await extensionAPI.createIdentity(identifier, privateKeys)

      void navigate('/')
    } catch (e) {
      console.error(e)

      // TODO: need to test it
      // Check if it's a wallet not found error
      if ((e)?.message?.includes('Wallet not found') === true) {
        // Redirect to wallet creation
        void navigate('/create-wallet')
        return
      }

      setError((e)?.message ?? e?.toString() ?? 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckClick = (): void => {
    void checkPrivateKey()
  }

  const handleImportClick = (): void => {
    void importIdentity()
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
                    {/* TODO check it */}
                    {identity.getId().base58()}
                  </Identifier>
                </ValueCard>
              </div>
              <div className='flex flex-col gap-[0.125rem]'>
                <Text dim>Balance</Text>

                <span>
                  {balance !== null && !Number.isNaN(Number(balance))
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
            onClick={handleImportClick}
          >
            {isLoading ? 'Importing...' : 'Import'}
          </Button>
        </div>}
    </div>
  )
}

export default withAuthCheck(ImportIdentityState)
