import { useEffect, useState } from 'react'
import { CORE_DASH_DECIMALS, assetLockPayment, formatDashAmount, unfinishedOperations } from '../../../../utils'
import type { UnfinishedOperation } from '../../../../utils'
import type { TransferApi } from '../transferApi'
import type { EndpointType, TransferDraft, WizardStep } from '../types'

interface TransferRetryParams {
  api: TransferApi
  draft: TransferDraft
  settledStatus: 'success' | 'failed' | null
  reloadCoreBalance: () => void
  resetDraft: (draft: TransferDraft) => void
  resetOperation: () => void
  goToStep: (step: WizardStep, replace?: boolean) => void
}

export interface TransferRetryState {
  // The current draft continues an unfinished operation, so Confirm pays nothing new.
  isContinuing: boolean
  pendingOperations: UnfinishedOperation[]
  continueOperation: (operation: UnfinishedOperation) => void
  handleRetry: () => void
}

const TARGET_TYPES: Record<UnfinishedOperation['purpose'], EndpointType> = { topUp: 'identity', fundAddress: 'platformAddress', shield: 'shielded' }

// Unfinished Core operations of the wallet and the Retry of a failed transfer, both repeating the same *FromWallet call.
export function useTransferRetry ({ api, draft, settledStatus, reloadCoreBalance, resetDraft, resetOperation, goToStep }: TransferRetryParams): TransferRetryState {
  const [continuedDraft, setContinuedDraft] = useState<TransferDraft | null>(null)
  const [pendingOperations, setPendingOperations] = useState<UnfinishedOperation[]>([])

  // Loads unfinished operations for a Core sender and refreshes its balance once a transfer settles.
  useEffect(() => {
    if (draft.from.type !== 'core') return
    if (settledStatus != null) reloadCoreBalance()
    api.listPendingAssetLocks().then(locks => setPendingOperations(unfinishedOperations(locks))).catch(e => console.log('listPendingAssetLocks error', e))
  }, [api, draft.from.type, settledStatus, reloadCoreBalance])

  // Fills the draft from an unfinished operation and opens Confirm; submitting it resumes that operation.
  const continueOperation = (operation: UnfinishedOperation): void => {
    const next: TransferDraft = {
      ...draft,
      from: { ...draft.from, type: 'core' },
      to: { type: TARGET_TYPES[operation.purpose], recipient: operation.recipient ?? '', shieldToMyself: operation.recipient == null },
      asset: { type: 'dash' },
      amount: formatDashAmount(assetLockPayment(operation.lockedDuffs), CORE_DASH_DECIMALS),
      isAdvanced: false,
      recipients: [],
      changeAddress: null
    }
    resetDraft(next)
    setContinuedDraft(next)
    goToStep('confirm')
  }

  // Repeats the same call; the backend resumes a payment already locked on L1.
  const handleRetry = (): void => {
    resetOperation()
    goToStep('confirm', true)
  }

  return { isContinuing: continuedDraft != null && continuedDraft === draft, pendingOperations, continueOperation, handleRetry }
}
