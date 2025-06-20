import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { base64 as base64Decoder } from '@scure/base'
import { useSdk } from '../../hooks/useSdk'
import TransactionDetails from './TransactionDetails'
import ValueCard from '../../components/containers/ValueCard'
import Identifier from '../../components/data/Identifier'
import Text from '../../text/Text'
import Button from '../../components/controls/buttons'
import { GetStateTransitionResponse } from '../../../types/messages/response/GetStateTransitionResponse'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { IdentityPublicKeyWASM, StateTransitionWASM } from 'pshenmic-dpp'
import { IdentityWASM } from 'pshenmic-dpp/dist/wasm'

export default function ApproveTransactionState (): React.JSX.Element {
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

  const [stateTransitionWASM, setStateTransitionWASM] = useState<StateTransitionWASM | null>(null)

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        // Load all identities and current identity
        const [availableIdentities, current] = await Promise.all([
          extensionAPI.getAvailableIdentities(),
          extensionAPI.getCurrentIdentity()
        ])

        setIdentities(availableIdentities ?? [])
        setCurrentIdentity(current)

        console.log('availableIdentities', availableIdentities)
        console.log('current', current)

        // Auto-set first identity as current if no current identity is set
        if ((current == null || current === '') && (availableIdentities?.length ?? 0) > 0) {
          console.log('Setting first identity as current:', availableIdentities[0])
          try {
            await extensionAPI.switchIdentity(availableIdentities[0])
            setCurrentIdentity(availableIdentities[0])
          } catch (error) {
            console.error('Failed to set current identity:', error)
          }
        }
      } catch (error) {
        console.error('Failed to load identities:', error)
      }
    }

    void loadData()
  }, [])

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
          console.log('State transition response:', stateTransitionResponse)
          try {
            const { StateTransitionWASM } = sdk.dpp

            setStateTransitionWASM(StateTransitionWASM.fromBytes(base64Decoder.decode(stateTransitionResponse.stateTransition.unsigned)))
            setIsLoadingTransaction(false)
          } catch (e) {
            console.error('Error decoding state transition:', e)
            setTransactionDecodeError(String(e))
            setIsLoadingTransaction(false)
          }
        })
        .catch((error) => {
          console.error('Error getting state transition:', error)
          setTransactionNotFound(true)
          setIsLoadingTransaction(false)
        })
    }
  }, [params.hash, params.txhash])

  if (identities.length === 0 && currentIdentity != null && currentIdentity !== '') {
    return <div>No identities</div>
  }

  const reject = (): void => {
    window.postMessage({ target: 'window', method: 'rejectSigning' })
    window.close()
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

      const identity: IdentityWASM = await sdk.identities.getByIdentifier(currentIdentity)
      const identityPublicKeys: IdentityPublicKeyWASM[] = identity.getPublicKeys()
      const [identityPublicKey] = identityPublicKeys
        .filter(publicKey => publicKey.getPurpose() === 'AUTHENTICATION' && publicKey.getSecurityLevel() === 'HIGH')

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
        <h1 className='h1-title'>Transaction was successfully broadcasted</h1>

        <ValueCard colorScheme='lightBlue' className='flex flex-col items-start gap-1'>
          <Text size='md' dim>Transaction hash</Text>

          <ValueCard colorScheme='white' className='flex justify-between w-full'>
            <Identifier
              highlight='both'
              copyButton
              ellipsis={false}
              className='w-full justify-between'
            >
              {txHash}
            </Identifier>
          </ValueCard>
        </ValueCard>

        <div className='flex gap-5 mt-5 w-full'>
          <Button className='w-full' onClick={() => window.close()}>Close</Button>
        </div>
      </div>
    )
  }

  const transactionHash = params.hash ?? params.txhash

  return (
    <div className='screen-content'>
      <h1 className='h1-title'>Transaction approval</h1>

      <ValueCard colorScheme='lightBlue' className='flex flex-col items-start gap-1'>
        <Text size='md' dim>Transaction hash</Text>

        <ValueCard colorScheme='white' className='flex justify-between w-full'>
          <Identifier
            highlight='both'
            copyButton
            ellipsis={false}
            className='w-full justify-between'
          >
            {transactionHash}
          </Identifier>
        </ValueCard>

        <div className='mt-2'>
          {isLoadingTransaction
            ? <Text>Loading transaction...</Text>
            : (transactionNotFound
              ? <Text color='red' weight='bold'>Could not find transaction with hash</Text>
              : (transactionDecodeError != null
                ? (
                  <Text color='red' weight='bold'>
                    Error decoding state transition: {transactionDecodeError}
                  </Text>
                )
                : (stateTransitionWASM != null && <TransactionDetails stateTransition={stateTransitionWASM} />)))}
        </div>
      </ValueCard>

      {!isLoadingTransaction && !transactionNotFound && stateTransitionWASM == null
        ? <Button onClick={() => { void navigate('/') }} className='mt-2'>Close</Button>
        : (stateTransitionWASM != null &&
          <div>
            <Text>Sign with identity:</Text>
            <select>
              {identities.map((identifier) =>
                <option key={identifier} value={identifier}>
                  {identifier}
                </option>
              )}
            </select>

            <div className='mt-4'>
              <Text>Password:</Text>
              <input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='w-full mt-2 p-2 border border-gray-300 rounded'
                placeholder='Enter password'
              />
              {passwordError != null && (
                <div className='text-red-500 text-sm mt-1'>
                  {passwordError}
                </div>
              )}
            </div>

            <div className='flex gap-5 mt-5'>
              <Button
                onClick={reject} colorScheme='red' variant='outline'
                className='w-1/2'
              >
                Reject
              </Button>
              <Button
                onClick={() => { void doSign() }}
                colorScheme='mint'
                className='w-1/2'
                disabled={!password.trim() || isSigningInProgress}
              >
                {isSigningInProgress ? 'Signing...' : 'Sign'}
              </Button>
            </div>
          </div>
        )}
    </div>
  )
}
