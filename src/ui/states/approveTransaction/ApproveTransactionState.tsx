import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useOutletContext } from 'react-router-dom'
import { base64 as base64Decoder } from '@scure/base'
import { Text, Button, Identifier, ValueCard, Input, Select } from 'dash-ui/react'
import { GetStateTransitionResponse } from '../../../types/messages/response/GetStateTransitionResponse'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { useSdk } from '../../hooks/useSdk'
import { useAsyncState } from '../../hooks/useAsyncState'
import { StateTransitionWASM } from 'pshenmic-dpp'
import { withAccessControl } from '../../components/auth/withAccessControl'
import type { OutletContext } from '../../types/OutletContext'
import LoadingScreen from '../../components/layout/LoadingScreen'
import { PublicKeySelect, PublicKeyInfo } from '../../components/keys/PublicKeySelect'

function ApproveTransactionState (): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const { currentNetwork, currentWallet, currentIdentity, setCurrentIdentity } = useOutletContext<OutletContext>()

  const params = useParams()

  const [transactionDecodeError, setTransactionDecodeError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isLoadingTransaction, setIsLoadingTransaction] = useState<boolean>(false)
  const [transactionNotFound, setTransactionNotFound] = useState<boolean>(false)

  const [identities, setIdentities] = useState<string[]>([])
  const [password, setPassword] = useState<string>('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSigningInProgress, setIsSigningInProgress] = useState<boolean>(false)
  const [isLoadingIdentities, setIsLoadingIdentities] = useState<boolean>(true)
  const [isCheckingWallet, setIsCheckingWallet] = useState<boolean>(true)
  const [hasWallet, setHasWallet] = useState<boolean>(false)

  const [stateTransitionWASM, setStateTransitionWASM] = useState<StateTransitionWASM | null>(null)
  const [selectedSigningKey, setSelectedSigningKey] = useState<string>('')
  const [signingKeys, setSigningKeys] = useState<PublicKeyInfo[]>([])
  const [signingKeysState, loadSigningKeys] = useAsyncState<PublicKeyInfo[]>()

  useEffect(() => {
    const checkWallet = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()
        if (status.currentWalletId == null || status.currentWalletId === '') {
          setHasWallet(false)
        } else {
          setHasWallet(true)
        }
      } catch (error) {
        console.warn('Failed to check wallet status:', error)
        setHasWallet(false)
      } finally {
        setIsCheckingWallet(false)
      }
    }

    void checkWallet()
  }, [extensionAPI])

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      if (isCheckingWallet || !hasWallet) {
        setIsLoadingIdentities(false)
        return
      }

      try {
        setIsLoadingIdentities(true)

        const availableIdentities = (await extensionAPI.getIdentities())
          .map(identity => identity.identifier)

        setIdentities(availableIdentities ?? [])
      } catch (error) {
        console.warn('Failed to load identities:', error)
      } finally {
        setIsLoadingIdentities(false)
      }
    }

    void loadData()
  }, [isCheckingWallet, hasWallet, currentWallet])

  // Load signing keys when wallet/identity/network changes
  useEffect(() => {
    if (currentWallet == null || currentNetwork == null || currentIdentity == null || currentIdentity === '') {
      setSigningKeys([])
      setSelectedSigningKey('')
      return
    }

    void loadSigningKeys(async () => {
      const allWallets = await extensionAPI.getAllWallets()
      const wallet = allWallets.find(w => w.walletId === currentWallet && w.network === currentNetwork)
      if (wallet == null) throw new Error('Wallet not found')

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
  }, [currentWallet, currentNetwork, currentIdentity])

  // Update local state when signing keys are loaded
  useEffect(() => {
    if (signingKeysState.data != null) {
      setSigningKeys(signingKeysState.data)
      if (signingKeysState.data.length > 0 && selectedSigningKey === '') {
        const firstKey = signingKeysState.data[0]
        const keyValue = firstKey.keyId?.toString() ?? (firstKey.hash !== '' ? firstKey.hash : 'key-0')
        setSelectedSigningKey(keyValue)
      }
    } else {
      setSigningKeys([])
      if (selectedSigningKey !== '') {
        setSelectedSigningKey('')
      }
    }
  }, [signingKeysState.data, selectedSigningKey])

  useEffect(() => {
    const transactionHash = params.hash ?? params.txhash
    if (transactionHash != null) {
      setIsLoadingTransaction(true)
      setTransactionNotFound(false)
      setTransactionDecodeError(null)

      extensionAPI
        .getStateTransition(transactionHash)
        .then((stateTransitionResponse: GetStateTransitionResponse) => {
          try {
            setStateTransitionWASM(StateTransitionWASM.fromBytes(base64Decoder.decode(stateTransitionResponse.stateTransition.unsigned)))
          } catch (e) {
            console.warn('Error decoding state transition:', e)
            setTransactionDecodeError(String(e))
          }
        })
        .catch((error) => {
          console.warn('Error getting state transition:', error)
          setTransactionNotFound(true)
        })
        .finally(() => setIsLoadingTransaction(false))
    }
  }, [params.hash, params.txhash])

  if (isCheckingWallet || isLoadingIdentities) {
    return (
      <LoadingScreen
        message={isCheckingWallet ? 'Checking wallet...' : 'Loading identities...'}
      />
    )
  }

  if (!hasWallet) {
    return (
      <div className='screen-content'>
        <h1 className='h1-title'>No Wallet Found</h1>

        <ValueCard colorScheme='lightGray' size='xl' border={false} className='flex flex-col items-start gap-2'>
          <Text size='md'>
            You need to create a wallet before you can approve transactions.
          </Text>
          <Text size='md'>
            Create a new wallet to manage your identities and approve transactions.
          </Text>
        </ValueCard>

        <div className='flex flex-col gap-2 w-full'>
          <Button
            onClick={async () => await navigate('/create-wallet')}
            colorScheme='brand'
          >
            Create Wallet
          </Button>
          <Button
            onClick={() => window.close()}
            colorScheme='lightBlue'
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // Show no identities message only after loading is complete
  if (identities.length === 0) {
    return (
      <div className='screen-content'>
        <h1 className='h1-title'>No Identities Available</h1>

        <ValueCard colorScheme='lightGray' border={false} className='flex flex-col items-start gap-4'>
          <Text size='md'>
            You need to have at least one identity to approve transactions.
          </Text>
          <Text size='md'>
            Import an existing identity or create a new one to continue.
          </Text>
        </ValueCard>

        <div className='flex flex-col gap-2 w-full'>
          <Button
            onClick={async () => await navigate('/choose-wallet-type')}
            colorScheme='brand'
          >
            Import Identity
          </Button>
          <Button
            onClick={() => window.close()}
            colorScheme='lightBlue'
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const reject = (): void => {
    if (stateTransitionWASM == null) {
      throw new Error('stateTransitionWASM is null')
    }

    extensionAPI.rejectStateTransition(stateTransitionWASM.hash(true)).then(window.close).catch(console.warn)
  }

  const doSign = async (): Promise<void> => {
    if (stateTransitionWASM == null) {
      throw new Error('stateTransitionWASM is null')
    }

    if (currentIdentity == null) {
      throw new Error('No current identity')
    }

    if (password === '') {
      setPasswordError('Password is required')
      return
    }

    setIsSigningInProgress(true)
    setPasswordError(null)

    try {
      if (stateTransitionWASM == null) {
        throw new Error('stateTransitionWASM is null')
      }

      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        setPasswordError('Invalid password')
        setIsSigningInProgress(false)
        return
      }

      // Use selected signing key or default to 1 for backward compatibility
      const keyId = selectedSigningKey !== '' ? parseInt(selectedSigningKey, 10) : 1
      const response = await extensionAPI.approveStateTransition(stateTransitionWASM.hash(true), currentIdentity, keyId, password)

      setTxHash(response.txHash)
    } catch (error) {
      setPasswordError(`Signing failed: ${error.toString() as string}`)
    } finally {
      setIsSigningInProgress(false)
    }
  }

  if (txHash != null) {
    return (
      <div className='screen-content'>
        <h1 className='h1-title'>
          Transaction was successfully broadcasted
        </h1>

        <div className='flex flex-col gap-2.5'>
          <Text size='md' className='opacity-50 font-medium'>Transaction hash</Text>
          <ValueCard colorScheme='lightBlue' size='xl'>
            <Identifier
              highlight='both'
              copyButton
              ellipsis={false}
              className='w-full justify-between'
            >
              {txHash}
            </Identifier>
          </ValueCard>
        </div>

        <div>
          <Button
            className='w-full'
            onClick={() => window.close()}
            colorScheme='lightBlue'
          >
            Close
          </Button>
        </div>
      </div>
    )
  }

  const transactionHash = params.hash ?? params.txhash

  // Prepare identity options for select
  const identityOptions = identities.map(identifier => ({
    value: identifier,
    content: (
      <Identifier
        middleEllipsis
        edgeChars={6}
        avatar
      >
        {identifier}
      </Identifier>
    )
  }))

  return (
    <div className='screen-content'>
      <div className='flex flex-col gap-6'>
        {/* Header */}
        <div className='flex flex-col gap-2.5'>
          <h1 className='h1-title'>
            Transaction<br />Approval
          </h1>
          <Text size='sm' opacity='50'>
            Carefully check the transaction details before signing
          </Text>
        </div>

        <div className='flex flex-col gap-2.5'>
          <Text size='md' opacity='50'>Transaction Hash</Text>
          <ValueCard colorScheme='lightGray' size='xl'>
            <Identifier
              highlight='both'
              linesAdjustment={false}
            >
              {transactionHash}
            </Identifier>
          </ValueCard>
          {isLoadingTransaction && <Text size='sm'>Loading transaction...</Text>}
          {transactionNotFound && <Text size='sm' color='red' weight='bold'>Could not find transaction with hash</Text>}
          {transactionDecodeError != null && (
            <Text size='sm' color='red' weight='bold'>
              Error decoding state transition: {transactionDecodeError}
            </Text>
          )}
        </div>

        {/* Choose Identity (wired to outlet context) */}
        {!isLoadingTransaction && !transactionNotFound && stateTransitionWASM != null && (
          <div className='flex flex-col gap-2.5'>
            <Text size='md' opacity='50'>Choose Identity</Text>
            <Select
              value={currentIdentity ?? ''}
              onChange={async (e: string) => {
                const identity = e
                setCurrentIdentity(identity)
                await extensionAPI.switchIdentity(identity).catch(err => console.warn('Failed to switch identity', err))
              }}
              options={identityOptions}
              showArrow
              size='xl'
            />
          </div>
        )}

        {/* Choose Signing Key */}
        {!isLoadingTransaction && !transactionNotFound && stateTransitionWASM != null && (
          <PublicKeySelect
            keys={signingKeys}
            value={selectedSigningKey}
            onChange={setSelectedSigningKey}
            loading={signingKeysState.loading}
            error={signingKeysState.error}
          />
        )}

        {/* Password */}
        {!isLoadingTransaction && !transactionNotFound && stateTransitionWASM != null && (
          <div className='flex flex-col gap-2.5'>
            <Text size='md' opacity='50'>Password</Text>
            <Input
              type='password'
              value={password}
              onChange={(e: { target: { value: React.SetStateAction<string> } }) => setPassword(e.target.value)}
              placeholder='Your Password'
              size='xl'
              variant='outlined'
              error={passwordError != null}
            />
            {passwordError != null && (
              <Text size='sm' color='red' className='mt-1'>
                {passwordError}
              </Text>
            )}
          </div>
        )}

        {/* Buttons */}
        {!isLoadingTransaction && !transactionNotFound && stateTransitionWASM == null
          ? (
            <div className='w-full'>
              <Button
                onClick={() => { void navigate('/') }}
                className='w-full'
                colorScheme='lightBlue'
              >
                Close
              </Button>
            </div>
            )
          : (stateTransitionWASM != null && (
            <div className='flex gap-2 w-full'>
              <Button
                onClick={reject}
                colorScheme='lightBlue'
                className='w-1/2'
              >
                Reject
              </Button>
              <Button
                onClick={() => { void doSign() }}
                colorScheme='brand'
                className='w-1/2'
                disabled={isSigningInProgress || selectedSigningKey === ''}
              >
                {isSigningInProgress ? 'Signing...' : 'Sign'}
              </Button>
            </div>
            ))}
      </div>
    </div>
  )
}

export default withAccessControl(ApproveTransactionState)
