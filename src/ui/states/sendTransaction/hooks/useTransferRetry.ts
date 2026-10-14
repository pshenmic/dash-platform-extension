import { useEffect, useRef, useState } from 'react'
import { continuationDraft, findResumedOperation, unfinishedOperations } from '../../../../utils'
import type { UnfinishedOperation } from '../../../../utils'
import type { TransferApi } from '../transferApi'
import type { TransferDraft, WizardStep } from '../types'

interface TransferRetryParams {
  api: TransferApi
  draft: TransferDraft
  settledStatus: 'success' | 'failed' | null
  // Asset lock of an operation to continue once it is loaded, e.g. from a notification.
  continueTxid: string | null
  reloadCoreBalance: () => void
  resetDraft: (draft: TransferDraft) => void
  resetOperation: () => void
  goToStep: (step: WizardStep, replace?: boolean) => void
}

export interface TransferRetryState {
  // Unfinished operation the current draft resumes, so Confirm pays nothing new.
  resumedOperation: UnfinishedOperation | null
  pendingOperations: UnfinishedOperation[]
  continueOperation: (operation: UnfinishedOperation) => void
  handleRetry: () => void
}

// Unfinished Core operations of the wallet and the Retry of a failed transfer, both repeating the same *FromWallet call.
export function useTransferRetry ({ api, draft, settledStatus, continueTxid, reloadCoreBalance, resetDraft, resetOperation, goToStep }: TransferRetryParams): TransferRetryState {
  const [pendingOperations, setPendingOperations] = useState<UnfinishedOperation[]>([])
  const continueTxidRef = useRef(continueTxid)

  // Loads unfinished operations for a Core sender and refreshes its balance once a transfer settles; a success keeps the list the result was shown with.
  useEffect(() => {
    if (draft.from.type !== 'core') return
    if (settledStatus != null) reloadCoreBalance()
    if (settledStatus === 'success') return
    api.listPendingAssetLocks().then(locks => setPendingOperations(unfinishedOperations(locks))).catch(e => console.log('listPendingAssetLocks error', e))
  }, [api, draft.from.type, settledStatus, reloadCoreBalance])

  // Fills the draft from an unfinished operation and opens Confirm; submitting it resumes that operation.
  const continueOperation = (operation: UnfinishedOperation): void => {
    resetDraft(continuationDraft(draft, operation))
    goToStep('confirm')
  }

  // Continues the requested operation once the list holds it.
  useEffect(() => {
    const operation = pendingOperations.find(item => item.assetLockTxid === continueTxidRef.current)
    if (operation == null) return
    continueTxidRef.current = null
    continueOperation(operation)
  }, [pendingOperations])

  // Repeats the same call; the backend resumes a payment already locked on L1.
  const handleRetry = (): void => {
    resetOperation()
    goToStep('confirm', true)
  }

  return { resumedOperation: findResumedOperation(pendingOperations, draft), pendingOperations, continueOperation, handleRetry }
}
