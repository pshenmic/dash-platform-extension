import type { PendingAssetLock } from '../types/messages/response/ListPendingAssetLocksResponse'

// Top up from Core paid on L1 whose Platform side can be repeated with the same payment.
export interface UnfinishedTopUp {
  purpose: 'topUp' | 'fundAddress'
  recipient: string
  fundingAddress: string
  fundingTxid: string
  lockedDuffs: bigint
}

// Identity top ups and address fundings that can be retried; registrations, shieldings and records without the payment are left out.
export const unfinishedTopUps = (locks: PendingAssetLock[]): UnfinishedTopUp[] =>
  locks.flatMap((lock): UnfinishedTopUp[] => {
    if (lock.purpose !== 'topUp' && lock.purpose !== 'fundAddress') return []
    const recipient = lock.purpose === 'topUp' ? lock.identityId : lock.platformAddress
    if (recipient == null || lock.fundingAddress == null || lock.fundingTxid == null || lock.amountDuffs == null) return []
    return [{ purpose: lock.purpose, recipient, fundingAddress: lock.fundingAddress, fundingTxid: lock.fundingTxid, lockedDuffs: BigInt(lock.amountDuffs) }]
  })

// Unfinished top up of `recipient` to finish instead of paying again: the one locking `lockedDuffs`, else the first listed.
export const findUnfinishedTopUp = (topUps: UnfinishedTopUp[], purpose: UnfinishedTopUp['purpose'], recipient: string, lockedDuffs: bigint | null): UnfinishedTopUp | null => {
  const matches = topUps.filter(topUp => topUp.purpose === purpose && topUp.recipient === recipient)
  return matches.find(topUp => topUp.lockedDuffs === lockedDuffs) ?? matches[0] ?? null
}

// Whether a shielding from Core left a paid asset lock behind.
export const hasPendingShield = (locks: PendingAssetLock[]): boolean => locks.some(lock => lock.purpose === 'shield')
