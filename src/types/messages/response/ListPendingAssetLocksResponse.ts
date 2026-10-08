import { AssetLockFundingPurpose } from '../../../content-script/storage/storageSchema'

// An asset lock this wallet put on L1 and has not finished spending. Amount and
// time are absent for an operation started before they were recorded.
export interface PendingAssetLock {
  assetLockTxid: string
  purpose: AssetLockFundingPurpose
  identityId: string | null
  amountDuffs: string | null
  createdAt: number | null
  // The deposit address that funded it, when the operation used one.
  fundingAddress: string | null
}

export interface ListPendingAssetLocksResponse {
  assetLocks: PendingAssetLock[]
}
