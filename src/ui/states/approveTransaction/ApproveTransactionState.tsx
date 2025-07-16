import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { base64 as base64Decoder } from '@scure/base'
import { useSdk } from '../../hooks/useSdk'
import TransactionDetails from './TransactionDetails'
import ValueCard from '../../components/containers/ValueCard'
import Identifier from '../../components/data/Identifier'
import { Input, Select } from '../../components/form'
import { Text, Button } from 'dash-ui/react'
import { GetStateTransitionResponse } from '../../../types/messages/response/GetStateTransitionResponse'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { IdentityPublicKeyWASM, StateTransitionWASM, IdentityWASM } from 'pshenmic-dpp'
import { withAuthCheck } from '../../components/auth/withAuthCheck'
import LoadingScreen from '../../components/layout/LoadingScreen'

function ApproveTransactionState (): React.JSX.Element {
  const navigate = useNavigate()
  const sdk = useSdk()
  const extensionAPI = useExtensionAPI()

  const params = useParams()

  const [transactionDecodeError, setTransactionDecodeError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isLoadingTransaction, setIsLoadingTransaction] = useState<boolean>(false)
  const [transactionNotFound, setTransactionNotFound] = useState<boolean>(false)

  const [identities, setIdentities] = useState<string[]>([])
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null)
  const [password, setPassword] = useState<string>('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSigningInProgress, setIsSigningInProgress] = useState<boolean>(false)
  const [isLoadingIdentities, setIsLoadingIdentities] = useState<boolean>(true)
  const [isCheckingWallet, setIsCheckingWallet] = useState<boolean>(true)
  const [hasWallet, setHasWallet] = useState<boolean>(false)

  const [stateTransitionWASM, setStateTransitionWASM] = useState<StateTransitionWASM | null>(null)

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
        console.error('Failed to check wallet status:', error)
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

        const current = await extensionAPI.getCurrentIdentity()

        setIdentities(availableIdentities ?? [])
        setCurrentIdentity(current)

        console.log('availableIdentities', availableIdentities)
        console.log('current', current)

        // Auto-set first identity as current if no current identity is set
        if ((current == null || current === '') && (availableIdentities?.length ?? 0) > 0) {
          try {
            await extensionAPI.switchIdentity(availableIdentities[0])
            setCurrentIdentity(availableIdentities[0])
          } catch (error) {
            console.error('Failed to set current identity:', error)
          }
        }
      } catch (error) {
        console.error('Failed to load identities:', error)
      } finally {
        setIsLoadingIdentities(false)
      }
    }

    void loadData()
  }, [isCheckingWallet, hasWallet])

  useEffect(() => {
    const transactionHash = params.hash ?? params.txhash
    if (transactionHash != null) {
      setIsLoadingTransaction(true)
      setTransactionNotFound(false)
      setTransactionDecodeError(null)

      console.log('Loading transaction with hash:', transactionHash)

      extensionAPI
        .getStateTransition(transactionHash)
        .then((stateTransitionResponse: GetStateTransitionResponse) => {
          try {
            setStateTransitionWASM(StateTransitionWASM.fromBytes(base64Decoder.decode(stateTransitionResponse.stateTransition.unsigned)))
          } catch (e) {
            console.error('Error decoding state transition:', e)
            setTransactionDecodeError(String(e))
          }
        })
        .catch((error) => {
          console.error('Error getting state transition:', error)
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

        <ValueCard colorScheme='lightGray' border={false} className='flex flex-col items-start gap-2'>
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
            colorScheme='mint'
          >
            Create Wallet
          </Button>
          <Button
            onClick={() => window.close()}
            colorScheme='gray'
            variant='outline'
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
            onClick={async () => await navigate('/import')}
            colorScheme='mint'
          >
            Import Identity
          </Button>
          <Button
            onClick={() => window.close()}
            colorScheme='gray'
            variant='outline'
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

    extensionAPI.rejectStateTransition(stateTransitionWASM.hash(true)).then(() => window.close).catch(console.error)
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

      const identity: IdentityWASM = await sdk.identities.getIdentityByIdentifier(currentIdentity)
      const identityPublicKeys: IdentityPublicKeyWASM[] = identity.getPublicKeys()
      const [identityPublicKey] = identityPublicKeys
        .filter(publicKey => publicKey.purpose === 'AUTHENTICATION' && publicKey.securityLevel === 'HIGH')

      if (identityPublicKey == null) {
        throw new Error('no identity public key')
      }

      const response = await extensionAPI.approveStateTransition(stateTransitionWASM.hash(true), currentIdentity, identityPublicKey, password)

      setTxHash(response.txHash)
    } catch (error) {
      console.error('Sign transition fails', error)
      setPasswordError('Signing failed')
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
            colorScheme='mint'
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
    label: identifier,
    avatar: true
  }))

  return (
    <div className='screen-content'>
      <div className='flex flex-col gap-6'>
        {/* Header */}
        <div className='flex flex-col gap-2.5'>
          <h1 className='h1-title'>
            Transaction{'\n'}Approval
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

          <div className='mt-3'>
            {isLoadingTransaction
              ? <Text size='sm'>Loading transaction...</Text>
              : (transactionNotFound
                ? <Text size='sm' color='red' weight='bold'>Could not find transaction with hash</Text>
                : (transactionDecodeError != null
                  ? (
                    <Text size='sm' color='red' weight='bold'>
                      Error decoding state transition: {transactionDecodeError}
                    </Text>
                  )
                  : (stateTransitionWASM != null && <TransactionDetails stateTransition={stateTransitionWASM}/>)))}
          </div>
        </div>

        {/* Choose Identity */}
        {!isLoadingTransaction && !transactionNotFound && stateTransitionWASM != null && (
          <div className='flex flex-col gap-2.5'>
            <Text size='md' opacity='50'>Choose Identity</Text>
            <Select
              value={currentIdentity ?? ''}
              onChange={(e) => setCurrentIdentity(e.target.value)}
              options={identityOptions}
              showArrow
              size='xl'
            />
          </div>
        )}

        {/* Password */}
        {!isLoadingTransaction && !transactionNotFound && stateTransitionWASM != null && (
          <div className='flex flex-col gap-2.5'>
            <Text size='md' opacity='50'>Password</Text>
            <Input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                colorScheme='gray'
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
                >
                  {isSigningInProgress ? 'Signing...' : 'Sign'}
                </Button>
              </div>
            ))}
      </div>
    </div>
  )
}

export default withAuthCheck(ApproveTransactionState)
