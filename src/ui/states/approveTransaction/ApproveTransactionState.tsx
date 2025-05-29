import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { base64 as base64Decoder } from '@scure/base'
import { useSdk } from '../../../hooks/useSdk'
import { useIdentitiesStore } from '../../../stores/identitiesStore'
import hash from 'hash.js'
import TransactionDetails from './TransactionDetails'
import ValueCard from '../../components/containers/ValueCard'
import Identifier from '../../components/data/Indetifier'
import Text from '../../text/Text'
import Button from '../../components/controls/buttons'

export default function () {
  const navigate = useNavigate()
  const sdk = useSdk()

  const params = useParams()

  const [transactionDecodeError, setTransactionDecodeError] = useState(null)
  const [txHash, setTxHash] = useState(null)

  const identities = useIdentitiesStore((state) => state.identities)
  const currentIdentity = useIdentitiesStore((state) => state.currentIdentity)
  const unsignedStateTransitions = useIdentitiesStore((state) => state.unsignedStateTransitions)

  const [stateTransition, setStateTransition] = useState(null)

  if (!identities?.length) {
    return <div>No identities</div>
  }

  const [unsignedStateTransition] = unsignedStateTransitions.filter(tx => tx.hash === params.txhash)

  useEffect(() => {
    try {
      const {StateTransitionWASM} = sdk.wasm

      if (!unsignedStateTransition) {
        return setTransactionDecodeError(`Could not find state transition with hash ${[params.txhash]}`)
      }

      setStateTransition(StateTransitionWASM.fromBytes(base64Decoder.decode(unsignedStateTransition.base64)))
    } catch (e) {
      setTransactionDecodeError(e.toString())
    }
  }, [])

  const [identity] = identities.filter(identity => identity.identifier === currentIdentity)

  const reject = () => {
    debugger
    window.postMessage({target: 'window', method: 'rejectSigning'})
    window.close()
  }

  const doSign = () => {
    debugger
    const {PrivateKeyWASM, IdentityWASM} = sdk.wasm
    const {bytesToHex, hexToBytes} = sdk.utils

    const [privateKey] = identity.privateKeys

    const privateKeyWASM = PrivateKeyWASM.fromBytes(hexToBytes(privateKey), 'Testnet')
    console.log('pkh', privateKeyWASM.getPublicKeyHash())

    const [identityPublicKey] = IdentityWASM
      .fromBytes(hexToBytes(identity.raw))
      .getPublicKeys()
      .filter((identityPublicKey) => identityPublicKey.getPublicKeyHash() === privateKeyWASM.getPublicKeyHash())

    if (!identityPublicKey) {
      throw new Error('Could not find a proper identity public key')
    }

    stateTransition.sign(privateKeyWASM, identityPublicKey)

    console.log(bytesToHex(stateTransition.toBytes()))

    sdk.stateTransitions.broadcast(stateTransition)
      .then(() => {
        const state_transition_hash = hash.sha256().update(stateTransition.toBytes()).digest('hex')

        setTxHash(state_transition_hash)
    }).catch((error) => {
      console.error('failz',error)
    })
  }

  if (txHash) {
    return (
      <div className={'screen-content'}>
        <h1 className={'h1-title'}>Transaction was successfully broadcasted</h1>

        <ValueCard colorScheme={'lightBlue'} className={'flex flex-col items-start gap-1'}>
          <Text size={'md'} dim>Transaction hash</Text>

          <ValueCard colorScheme={'white'} className={'flex justify-between w-full'}>
            <Identifier
              highlight={'both'}
              copyButton={true}
              ellipsis={false}
              className={'w-full justify-between'}
            >
              {txHash}
            </Identifier>
          </ValueCard>
        </ValueCard>

        <div className={'flex gap-5 mt-5 w-full'}>
          <Button className={'w-full'} onClick={() => window.close()}>Close</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={'screen-content'}>
      <h1 className={'h1-title'}>Transaction approval</h1>

      <ValueCard colorScheme={'lightBlue'} className={'flex flex-col items-start gap-1'}>
        <Text size={'md'} dim>Transaction hash</Text>

        <ValueCard colorScheme={'white'} className={'flex justify-between w-full'}>
          <Identifier
            highlight={'both'}
            copyButton={true}
            ellipsis={false}
            className={'w-full justify-between'}
          >
            {params.txhash}
          </Identifier>
        </ValueCard>

        <div className={'mt-2'}>
          {!unsignedStateTransition
            ? <Text color={'red'} weight={'bold'}>Could not find transaction with hash</Text>
            : transactionDecodeError
              ? <Text color={'red'} weight={'bold'}>Error decoding state transition, please report the issue</Text>
              : <TransactionDetails stateTransition={stateTransition}/>
          }
        </div>
      </ValueCard>

      {!unsignedStateTransition
        ? <Button onClick={() => navigate('/')} className={'mt-2'}>Close</Button>
        : <div>
            <Text>Sign with identity:</Text>
            <select>
              <option>{identity.identifier}</option>
            </select>

            <div className={'flex gap-5 mt-5'}>
              <Button onClick={reject} colorScheme={'red'} variant={'outline'} className={'w-1/2'}>Reject</Button>
              <Button onClick={doSign} colorScheme={'mint'} className={'w-1/2'}>Sign</Button>
            </div>
          </div>
      }
    </div>
  )
}
