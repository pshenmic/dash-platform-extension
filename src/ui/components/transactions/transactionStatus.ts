import type { StatusKey } from 'dash-ui-kit/react'

const STATUS_KEYS = new Set(['SUCCESS', 'FAIL', 'QUEUED', 'POOLED', 'BROADCASTED'])

/** Explorer status string to icon key; anything unrecognized gets no icon. */
export function toStatusKey (status: string | null | undefined): StatusKey | null {
  if (status == null || status === '') return null

  const upper = status.toUpperCase()

  return STATUS_KEYS.has(upper) ? upper as StatusKey : null
}

interface CoreSettlement {
  chainLocked: boolean | null
  confirmations: number | null
}

/** Core reports no status, so settlement is read off the chain lock / confirmations. */
export function coreStatusKey (transaction: CoreSettlement): StatusKey {
  const settled = transaction.chainLocked === true || (transaction.confirmations ?? 0) > 0

  return settled ? 'SUCCESS' : 'QUEUED'
}
