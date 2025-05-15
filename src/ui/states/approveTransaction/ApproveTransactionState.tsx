import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { base64 as base64Decoder } from '@scure/base'
import { useSdk } from '../../../hooks/useSdk'
import { useIdentitiesStore } from '../../../stores/identitiesStore'
import hash from 'hash.js'
import './approve.transaction.css'
import TransactionDetails from './TransactionDetails'

export default function () {
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

  if (!unsignedStateTransition) {
    return <div className={'ApproveTransaction__Error'}>Could not find transaction with hash {params.txhash}</div>
  }

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
    return <div className={'ApproveTransaction__Container'}>
      <span className={'ApproveTransaction__Title'}>Transaction was successfully broadcasted</span>
      <hr/>
      <span className={'ApproveTransaction__TxHash'}>{txHash}</span>
      <hr/>
      <div className={'ApproveTransaction__Buttons'}>
        <button onClick={() => window.close()}>Close</button>
      </div>
    </div>
  }

  return (
    <div className={'ApproveTransaction__Container'}>
      <div className={'ApproveTransaction__Title'}>Approve transaction</div>
      <hr/>
      <div className={'ApproveTransaction__TxHash'}>{params.txhash}</div>
      <hr/>

      {transactionDecodeError && <div className={'ApproveTransaction__Error'}>Error decoding state transition, please report the issue</div>}
      {stateTransition && <TransactionDetails stateTransition={stateTransition}/>}
      <hr/>

      <span className={'ApproveTransaction__SignWith'}>Sign with identity:</span>
      <select className={'ApproveTransaction__SignWith__Select'}>
        <option>{identity.identifier}</option>
      </select>

      <div className={'ApproveTransaction__Buttons'}>
        <button onClick={reject}>Reject</button>
        <button onClick={doSign}>Sign</button>
      </div>
    </div>
  )
}
