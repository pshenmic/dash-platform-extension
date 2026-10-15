import type { PendingAssetLock } from '../types/messages/response/ListPendingAssetLocksResponse'
import type { EndpointType, TransferDraft } from '../ui/states/sendTransaction/types'
import { CORE_DASH_DECIMALS, SHIELD_DEPOSIT_FEE_DUFFS, assetLockPayment, formatDashAmount } from './transferAmount'
import { isShieldToMyself } from './transferDirection'

// Core payment made on L1 whose Platform side the same *FromWallet call finishes; `recipient` null is the wallet's own shielded pool.
export interface UnfinishedOperation {
  purpose: 'topUp' | 'fundAddress' | 'shield'
  recipient: string | null
  fundingTxid: string
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

    return [{ purpose: lock.purpose, recipient: recipient ?? null, fundingTxid: lock.fundingTxid, lockedDuffs: BigInt(lock.amountDuffs) }]
  })
}

// Recipient type each unfinished operation pays.
export const UNFINISHED_OPERATION_TARGETS: Record<UnfinishedOperation['purpose'], EndpointType> = { topUp: 'identity', fundAddress: 'platformAddress', shield: 'shielded' }

// Operation a submit of the draft would resume instead of paying: a simple Core payment of Dash to the same recipient.
export const findResumedOperation = (operations: UnfinishedOperation[], draft: TransferDraft): UnfinishedOperation | null => {
  if (draft.from.type !== 'core' || draft.isAdvanced || draft.asset.type !== 'dash') return null
  const recipient = isShieldToMyself(draft) ? null : draft.to.recipient.trim()

  return operations.find(operation => UNFINISHED_OPERATION_TARGETS[operation.purpose] === draft.to.type && operation.recipient === recipient) ?? null
}

// Core payment and the amount delivered on Platform of an unfinished operation, in duffs.
export const resumedAmounts = (operation: UnfinishedOperation): { amount: bigint, received: bigint } => ({
  amount: assetLockPayment(operation.lockedDuffs),
  received: operation.purpose === 'shield' ? operation.lockedDuffs - SHIELD_DEPOSIT_FEE_DUFFS : operation.lockedDuffs
})

// Draft that resumes the operation: a simple Core payment of its amount to its recipient.
export const continuationDraft = (draft: TransferDraft, operation: UnfinishedOperation): TransferDraft => ({
  ...draft,
  from: { ...draft.from, type: 'core' },
  to: { type: UNFINISHED_OPERATION_TARGETS[operation.purpose], recipient: operation.recipient ?? '', shieldToMyself: operation.recipient == null },
  asset: { type: 'dash' },
  amount: formatDashAmount(assetLockPayment(operation.lockedDuffs), CORE_DASH_DECIMALS),
  isAdvanced: false,
  recipients: [],
  changeAddress: null
})
