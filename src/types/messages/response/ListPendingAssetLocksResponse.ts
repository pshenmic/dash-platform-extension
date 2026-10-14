import { AssetLockFundingPurpose } from '../../../content-script/storage/storageSchema'

// An operation that has the wallet's money committed to it and nothing to show
// for it yet. Two shapes, told apart by `assetLockTxid`:
//
//   set  - the asset lock is on L1, only the Platform side is missing;
//   null - the funding address was paid and the asset lock never followed.
//
// Both are finished the same way: call the `*FromWallet` method again with the
// same recipient. Amount and time are absent for an operation started before
// they were recorded.
export interface PendingAssetLock {
  assetLockTxid: string | null
  // The address that paid and the transaction that paid it: repeating the
  // operation with these finishes it, without paying again.
  fundingAddress: string | null
  fundingTxid: string | null
  purpose: AssetLockFundingPurpose
  // Which of the two shapes above this is, so a caller does not have to infer
  // it from a null.
  stage: 'funded' | 'assetLocked'
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
