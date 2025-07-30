import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Text, Identifier, ValueCard, BigNumber, Textarea } from 'dash-ui/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { withAuthCheck } from '../../components/auth/withAuthCheck'
import LoadingScreen from '../../components/layout/LoadingScreen'
import {Identity} from "../../../types/Identity";
import {hexToBytes, normalizePrivateKey} from "../../../utils";
import * as secp from '@noble/secp256k1';
import hash from "hash.js";

function ImportIdentityState (): React.JSX.Element {
  const navigate = useNavigate()

  const extensionAPI = useExtensionAPI()
  const [privateKey, setPrivateKey] = useState('')
  const [identity, setIdentity] = useState<Identity | null>(null)
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
        console.error('Failed to check wallet status:', error)
        void navigate('/create-wallet')
      }
    }

    void checkWallet()
  }, [extensionAPI, navigate])

  const checkPrivateKey = async (): Promise<void> => {
    setError(null)
    setIsLoading(true)

    const privateKeyHex = normalizePrivateKey(privateKey)


    if (privateKeyHex == null) {
      setIsLoading(false)

      return setError('Private key is not valid')
    }

    const pubKey = secp.getPublicKey(hexToBytes(privateKeyHex));
    const pubKeyHash = hash.sha256().update(pubKey).digest('hex')

    const identity = await extensionAPI.fetchIdentityByPublicKeyHash(pubKeyHash)

    if( identity == null) {
      throw new Error('Could not find identity belonging to that private key')
    }

    setIdentity(identity)
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

      if (privateKey == null) {
        return setError('Could not load private key')
      }

      const privateKeys = [normalizePrivateKey(privateKey)!]

      await extensionAPI.createIdentity(identity.identifier, privateKeys)

      void navigate('/')
    }

    setIsLoading(true)
    setError(null)

    run()
      .catch(e => {
        console.error(e)

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
    checkPrivateKey().catch(console.error)
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
                    {identity.identifier}
                  </Identifier>
                </ValueCard>
              </div>
              <div className='flex flex-col gap-[0.125rem]'>
                <Text dim>Balance</Text>

                <span>
                  {(
                      <Text size='xl' weight='bold' monospace>
                        <BigNumber>
                          {identity.balance}
                        </BigNumber>
                      </Text>
                      )}
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

export default withAuthCheck(ImportIdentityState)
