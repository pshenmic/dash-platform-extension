import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { base64 as base64Decoder } from '@scure/base'
import { useSdk } from '../../hooks/useSdk'
import TransactionDetails from './TransactionDetails'
import ValueCard from '../../components/containers/ValueCard'
import Identifier from '../../components/data/Identifier'
import Text from '../../text/Text'
import Button from '../../components/controls/buttons'
import { Identity } from '../../../types/Identity'
import { GetStateTransitionResponse } from '../../../types/messages/response/GetStateTransitionResponse'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'

export default function ApproveTransactionState (): React.JSX.Element {
  const navigate = useNavigate()
  const sdk = useSdk()
  const extensionAPI = useExtensionAPI()

  const params = useParams()

  const [transactionDecodeError, setTransactionDecodeError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const [identities] = useState<Identity[]>([])
  const [currentIdentity] = useState<Identity | null>(null)

  const [stateTransition, setStateTransition] = useState<any>(null)

  if (identities.length === 0) {
    return <div>No identities</div>
  }

  useEffect(() => {
    if (params.hash != null) {
      extensionAPI
        .getStateTransition(params.hash)
        .then((stateTransitionResponse: GetStateTransitionResponse) => {
          try {
            const { StateTransitionWASM } = sdk.wasm

            setStateTransition(StateTransitionWASM.fromBytes(base64Decoder.decode(stateTransitionResponse.stateTransition.unsigned)))
          } catch (e) {
            setTransactionDecodeError(String(e))
          }
        })
        .catch(console.error)
    }
  }, [])

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
            {params.txhash}
          </Identifier>
        </ValueCard>

        <div className='mt-2'>
          {stateTransition == null
            ? <Text color='red' weight='bold'>Could not find transaction with hash</Text>
            : (transactionDecodeError != null
                ? (
                  <Text color='red' weight='bold'>
                    Error decoding state transition, please report the issue
                  </Text>
                  )
                : <TransactionDetails stateTransition={stateTransition} />)}
        </div>
      </ValueCard>

      {stateTransition == null
        ? <Button onClick={() => { void navigate('/') }} className='mt-2'>Close</Button>
        : (
          <div>
            <Text>Sign with identity:</Text>
            <select>
              <option>{currentIdentity?.identifier}</option>
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
