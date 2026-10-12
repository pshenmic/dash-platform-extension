import { useEffect, useState } from 'react'
import { CORE_DASH_DECIMALS, assetLockPayment, assetLockReceived, findUnfinishedTopUp, formatDashAmount, hasPendingShield, isAssetLockMode, unfinishedTopUps } from '../../../../utils'
import type { UnfinishedTopUp } from '../../../../utils'
import { SHIELD_NOT_RESUMABLE_MESSAGE } from '../constants'
import type { TransferApi } from '../transferApi'
import type { TransferDraft, TransferMode, WizardStep } from '../types'
import type { TransferResume } from './useTransferOperation'

// Retry that continues a transfer, valid only while the draft it was made for is current.
interface PendingRetry {
  draft: TransferDraft
  resume: TransferResume
}

interface TransferRetryParams {
  api: TransferApi
  draft: TransferDraft
  mode: TransferMode | null
  amount: bigint | null
  settledStatus: 'success' | 'failed' | null
  reloadCoreBalance: () => void
  resetDraft: (draft: TransferDraft) => void
  resetOperation: () => void
  goToStep: (step: WizardStep, replace?: boolean) => void
}

export interface TransferRetryState {
  // Paid Core payment the next Confirm locks into Platform instead of paying again.
  resume: TransferResume | null
  // Why the failed transfer must not be retried.
  retryBlock: string | null
  pendingTopUps: UnfinishedTopUp[]
  resumeTopUp: (topUp: UnfinishedTopUp) => void
  handleRetry: () => void
}

// Unfinished Core top ups of the wallet and the Retry of a failed transfer.
export function useTransferRetry ({ api, draft, mode, amount, settledStatus, reloadCoreBalance, resetDraft, resetOperation, goToStep }: TransferRetryParams): TransferRetryState {
  const [retry, setRetry] = useState<PendingRetry | null>(null)
  const [retryBlock, setRetryBlock] = useState<string | null>(null)
  const [pendingTopUps, setPendingTopUps] = useState<UnfinishedTopUp[]>([])

  const resume = retry != null && retry.draft === draft ? retry.resume : null

  // Loads unfinished top ups for a Core sender and refreshes its balance once a transfer settles.
  useEffect(() => {
    if (draft.from.type !== 'core') return
    if (settledStatus != null) reloadCoreBalance()
    api.listPendingAssetLocks().then(locks => setPendingTopUps(unfinishedTopUps(locks))).catch(e => console.log('listPendingAssetLocks error', e))
  }, [api, draft.from.type, settledStatus, reloadCoreBalance])

  // Fills the draft from an unfinished top up and opens Confirm to finish it with the same payment.
  const resumeTopUp = (topUp: UnfinishedTopUp, replace = false): void => {
    const toType = topUp.purpose === 'topUp' ? 'identity' : 'platformAddress'
    const next: TransferDraft = {
      ...draft,
      from: { ...draft.from, type: 'core' },
      to: { ...draft.to, type: toType, recipient: topUp.recipient },
      asset: { type: 'dash' },
      amount: formatDashAmount(assetLockPayment(topUp.lockedDuffs), CORE_DASH_DECIMALS),
      isAdvanced: false,
      recipients: [],
      changeAddress: null
    }
    resetDraft(next)
    setRetry({ draft: next, resume: { address: topUp.fundingAddress, txid: topUp.fundingTxid } })
    setRetryBlock(null)
    goToStep('confirm', replace)
  }

  const repeatTransfer = (): void => {
    setRetry(null)
    setRetryBlock(null)
    resetOperation()
    goToStep('confirm', true)
  }

  // Retry of a Core -> Platform transfer finishes a paid asset lock instead of paying again; a paid shielding is not repeated.
  const handleRetry = (): void => {
    if (!isAssetLockMode(mode)) {
      repeatTransfer()
      return
    }

    api.listPendingAssetLocks()
      .then(locks => {
        const topUps = unfinishedTopUps(locks)
        setPendingTopUps(topUps)

        if (mode === 'coreShield') {
          if (hasPendingShield(locks)) setRetryBlock(SHIELD_NOT_RESUMABLE_MESSAGE)
          else repeatTransfer()
          return
        }

        const purpose = mode === 'coreTopUp' ? 'topUp' : 'fundAddress'
        const topUp = findUnfinishedTopUp(topUps, purpose, draft.to.recipient, amount != null ? assetLockReceived(amount) : null)
        if (topUp == null) {
          repeatTransfer()
          return
        }
        resetOperation()
        resumeTopUp(topUp, true)
      })
      .catch(e => setRetryBlock(e instanceof Error ? e.message : String(e)))
  }

  return { resume, retryBlock, pendingTopUps, resumeTopUp: (topUp) => resumeTopUp(topUp), handleRetry }
}
