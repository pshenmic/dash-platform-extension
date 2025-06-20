import React, { useEffect, useState } from 'react'
import { useSdk } from '../../../hooks/useSdk'
import './documents.batch.details.css'
import DocumentCreateTransition from './DocumentCreateTransition'

export default function DocumentsBatchDetails ({ stateTransition }) {
  const sdk = useSdk()

  const [transitions, setTransitions] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    try {
      const documentsBatch = sdk.dpp.BatchTransitionWASM.fromStateTransition(stateTransition)

      const { transitions } = documentsBatch
      setTransitions(transitions)
    } catch (e) {
      console.error(e)
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
