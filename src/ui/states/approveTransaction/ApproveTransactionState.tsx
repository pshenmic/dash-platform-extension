import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { base64 as base64Decoder } from '@scure/base'
import { useSdk } from '../../hooks/useSdk'
import TransactionDetails from './TransactionDetails'
import ValueCard from '../../components/containers/ValueCard'
import Identifier from '../../components/data/Identifier'
import Text from '../../text/Text'
import Button from '../../components/controls/buttons'
// import { Identity } from '../../../types/Identity'
import { GetStateTransitionResponse } from '../../../types/messages/response/GetStateTransitionResponse'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'

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

  const [stateTransition, setStateTransition] = useState<any>(null)

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

        // // Auto-set first identity as current if no current identity is set
        // if ((current == null || current === '') && (availableIdentities?.length ?? 0) > 0) {
        //   console.log('Setting first identity as current:', availableIdentities[0])
        //   try {
        //     await extensionAPI.switchIdentity(availableIdentities[0])
        //     setCurrentIdentity(availableIdentities[0])
        //   } catch (error) {
        //     console.error('Failed to set current identity:', error)
        //   }
        // }
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

            setStateTransition(StateTransitionWASM.fromBytes(base64Decoder.decode(stateTransitionResponse.stateTransition.unsigned)))
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

  const doSign = (): void => {
    sdk.stateTransitions.broadcast(stateTransition)
      .then(() => {
        const stateTransitionHash = stateTransition.hash

        setTxHash(stateTransitionHash)
      }).catch((error: Error) => {
        console.error('failz', error)
      })
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
                    : (stateTransition != null && <TransactionDetails stateTransition={stateTransition} />)))}
        </div>
      </ValueCard>

      {!isLoadingTransaction && !transactionNotFound && stateTransition == null
        ? <Button onClick={() => { void navigate('/') }} className='mt-2'>Close</Button>
        : (stateTransition != null &&
          <div>
            <Text>Sign with identity:</Text>
            <select>
              {identities.map((identifier) =>
                <option key={identifier} value={identifier}>
                  {identifier}
                </option>
              )}
            </select>

            <div className='flex gap-5 mt-5'>
              <Button
                onClick={reject} colorScheme='red' variant='outline'
                className='w-1/2'
              >
                Reject
              </Button>
              <Button onClick={doSign} colorScheme='mint' className='w-1/2'>Sign</Button>
            </div>
          </div>
          )}
    </div>
  )
}
