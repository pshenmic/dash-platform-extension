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

export default function () {
  const navigate = useNavigate()
  const sdk = useSdk()

  const extensionAPI = useExtensionAPI()
  const { uint8ArrayToBase58 } = sdk.utils
  const [privateKey, setPrivateKey] = useState(null)
  const [privateKeyWASM, setPrivateKeyWASM] = useState(null)
  const [identity, setIdentity] = useState(null)
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // TODO implement new storage
  const [identities, setIdentities] = useState([])
  const [currentIdentity, setCurrentIdentity] = useState(null)
  const [identityBalance, setIdentityBalance] = useState(0)

  const checkPrivateKey = async () => {
    const status = await extensionAPI.getStatus()
    console.log(status)
    setError(null)
    setIsLoading(true)

    // Check if DPP is available
    if (!sdk.dpp || !sdk.dpp.PrivateKeyWASM) {
      setIsLoading(false)
      return setError('DPP module not available. Please try again.')
    }

    let pkeyWASM = null

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

      if (e.code === 5) {
        setIsLoading(false)
        return setError('Identity related to this private key was not found')
      }

      setIsLoading(false)
      setError(e.toString())
    }

    setIsLoading(false)
  }

  useEffect(() => {
    if (error) {
      setError(null)
    }
  }, [privateKey])

  const importIdentity = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Prepare data for CREATE_IDENTITY
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

      navigate('/')
    } catch (e) {
      console.error(e)

      // TODO: need to test it
      // Check if it's a wallet not found error
      if (e.message && e.message.includes('Wallet not found')) {
        // Redirect to wallet creation
        navigate('/create-wallet')
        return
      }

      setError(e.message || e.toString())
    }

    setIsLoading(false)
  }

  return (
    <div className='flex flex-col gap-2'>
      <span className='h1-title'>Import your identity</span>

      {!identity &&
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

          {!!error &&
            <div className='py-1'>
              <span>{error}</span>
            </div>}

          <div>
            <Button
              colorScheme='brand'
              disabled={!privateKey || isLoading}
              className='w-full'
              onClick={checkPrivateKey}
            >
              {isLoading ? 'Checking...' : 'Check'}
            </Button>
          </div>
        </div>}

      {identity &&
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
                    {identity || ''}
                  </Identifier>
                </ValueCard>
              </div>
              <div className='flex flex-col gap-[0.125rem]'>
                <Text dim>Balance</Text>

                <span>
                  {!Number.isNaN(Number(balance))
                    ? <Text size='xl' weight='bold' monospace>
                      <BigNumber>
                        {balance}
                      </BigNumber>
                    </Text>
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
            disabled={!privateKey || isLoading}
            className='w-full'
            onClick={importIdentity}
          >
            {isLoading ? 'Importing...' : 'Import'}
          </Button>
        </div>}
    </div>
  )
}
