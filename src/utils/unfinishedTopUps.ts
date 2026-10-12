import type { PendingAssetLock } from '../types/messages/response/ListPendingAssetLocksResponse'

// Top up from Core paid on L1 whose Platform side can be repeated with the same payment.
export interface UnfinishedTopUp {
  purpose: 'topUp' | 'fundAddress'
  recipient: string
  fundingAddress: string
  fundingTxid: string
  lockedDuffs: bigint
}

const recipientOf = (lock: PendingAssetLock): string | null => {
  if (lock.purpose === 'topUp') return lock.identityId
  if (lock.purpose === 'fundAddress') return lock.platformAddress
  return null
}

// Identity top ups and address fundings that can be retried; registrations and records without the payment are left out.
export const unfinishedTopUps = (locks: PendingAssetLock[]): UnfinishedTopUp[] =>
  locks.flatMap((lock): UnfinishedTopUp[] => {
    const recipient = recipientOf(lock)
    if (lock.purpose === 'registration' || recipient == null || lock.fundingAddress == null || lock.fundingTxid == null || lock.amountDuffs == null) return []
    return [{ purpose: lock.purpose, recipient, fundingAddress: lock.fundingAddress, fundingTxid: lock.fundingTxid, lockedDuffs: BigInt(lock.amountDuffs) }]
  })
