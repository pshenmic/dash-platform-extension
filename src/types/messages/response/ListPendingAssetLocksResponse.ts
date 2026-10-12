import { AssetLockFundingPurpose } from '../../../content-script/storage/storageSchema'

// An asset lock this wallet put on L1 and has not finished spending. Amount and
// time are absent for an operation started before they were recorded.
export interface PendingAssetLock {
  assetLockTxid: string
  // The address that paid and the transaction that paid it: repeating the
  // operation with these finishes it, without paying again.
  fundingAddress: string | null
  fundingTxid: string | null
  purpose: AssetLockFundingPurpose
  // Who the money was for: an identity for a top-up, a platform address for a
  // funding, a shielded address for a shield, none of them for a registration.
  // A shield into the wallet's own pool leaves all three null - that is what
  // tells it apart from a shield to someone else.
  identityId: string | null
  platformAddress: string | null
  shieldedAddress: string | null
  amountDuffs: string | null
  createdAt: number | null
}

export interface ListPendingAssetLocksResponse {
  assetLocks: PendingAssetLock[]
}
