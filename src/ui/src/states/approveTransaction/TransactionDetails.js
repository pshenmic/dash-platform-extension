import React from 'react'
import DocumentsBatchDetails from './details/DocumentsBatchDetails'

export default function TransactionDetails ({ stateTransition }) {
  switch (stateTransition.type) {
    default:
      return <DocumentsBatchDetails stateTransition={stateTransition}/>
    // default:
    //   throw new Error(`Unsupported state transition type: ${stateTransition.type}`)
  }
};
