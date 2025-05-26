import React from 'react'
import './documents.batch.details.css'
import { useSdk } from '../../../../hooks/useSdk.js'

export default function DocumentCreateTransition ({transition, createTransition}) {
  const sdk = useSdk()
  const {uint8ArrayToBase58} = sdk.utils
  return (
    <div className={'DocumentsBatchDetails__Details'}>
      <div>Type: DocumentsBatch</div>
      <div>Document Transition: {transition.actionType}</div>
      <div>Document: {uint8ArrayToBase58(createTransition.base.id)}</div>
      <div>Data: {JSON.stringify(createTransition.data)}</div>
      <div>Data Contract: {uint8ArrayToBase58(transition.dataContractId)}</div>
      <div>Revision: {transition.revision}</div>
      <div>Document Type Name: {transition.documentTypeName}</div>
      <div>Identity Contract Nonce: {transition.identityContractNonce}</div>
    </div>
  )
}
