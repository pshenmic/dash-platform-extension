import React, { useEffect, useState } from 'react'
import { useSdk } from '../../../hooks/useSdk'
import './documents.batch.details.css'
import DocumentCreateTransition from './DocumentCreateTransition'

export default function DocumentsBatchDetails ({ stateTransition }) {
  const sdk = useSdk()
  const { uint8ArrayToBase58 } = sdk.utils

  const [transitions, setTransitions] = useState(false)
  const [documentsBatch, setDocumentsBatch] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    try {
      const documentsBatch = sdk.wasm.DocumentsBatchWASM.fromStateTransition(stateTransition)
      setDocumentsBatch(documentsBatch)

      const { transitions } = documentsBatch
      setTransitions(transitions)
    } catch (e) {
      console.error(e)
      setDocumentsBatch(null)
      setTransitions(null)
      setError(e)
    }
  }, [])

  if (error) {
    return <div>Error during decoding DocumentsBatch state transition</div>
  }

  if (!transitions) {
    return <div />
  }
  const transitionComponent = {
    create: <DocumentCreateTransition createTransition={transitions[0].createTransition} transition={transitions[0]} />
  }[transitions[0].actionType]

  return (
    <div>
      {error && <div className='DocumentsBatchDetails__Error'>Error during decoding DocumentsBatch state transition</div>}
      {transitionComponent}
    </div>
  )
}
