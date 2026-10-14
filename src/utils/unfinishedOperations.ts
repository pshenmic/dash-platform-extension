import type { PendingAssetLock } from '../types/messages/response/ListPendingAssetLocksResponse'

// Core payment locked on L1 whose Platform side the same *FromWallet call finishes; `recipient` null is the wallet's own shielded pool.
export interface UnfinishedOperation {
  purpose: 'topUp' | 'fundAddress' | 'shield'
  recipient: string | null
  assetLockTxid: string
  lockedDuffs: bigint
}

// Pool a shield went to; null, undefined and 'own' all mean the wallet's own.
const shieldRecipient = (address: string | null | undefined): string | null =>
  address == null || address === 'own' ? null : address

const recipientOf = (lock: PendingAssetLock): string | null | undefined => {
  if (lock.purpose === 'topUp') return lock.identityId
  if (lock.purpose === 'fundAddress') return lock.platformAddress
  return shieldRecipient(lock.shieldedAddress)
}

// Operations a repeated *FromWallet call resumes: the oldest wallet-paid record per purpose and recipient; registrations, deposit-address entries and records without an amount are left out.
export const unfinishedOperations = (locks: PendingAssetLock[]): UnfinishedOperation[] => {
  const oldestFirst = [...locks].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
  const seen = new Set<string>()

  return oldestFirst.flatMap((lock): UnfinishedOperation[] => {
    if (lock.purpose !== 'topUp' && lock.purpose !== 'fundAddress' && lock.purpose !== 'shield') return []
    const recipient = recipientOf(lock)
    if (lock.fundingTxid == null || lock.amountDuffs == null || (lock.purpose !== 'shield' && recipient == null)) return []

    const key = `${lock.purpose}:${recipient ?? ''}`
    if (seen.has(key)) return []
    seen.add(key)

    return [{ purpose: lock.purpose, recipient: recipient ?? null, assetLockTxid: lock.assetLockTxid, lockedDuffs: BigInt(lock.amountDuffs) }]
  })
}
