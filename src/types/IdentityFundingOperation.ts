import { RepositoryScope } from './RepositoryScope'
import { CoreAssetLockPlan } from '../utils/buildAssetLockFromUtxos'
import { AssetLockProof } from './AssetLockProof'

// The wallet funds an identity is paid from.
export type IdentityFundingSource = 'core'

export interface IdentityFundingOperation extends RepositoryScope {
  id: string
  kind: 'registration' | 'topUp'
  source: IdentityFundingSource
  account: number
  amountCredits: string
  identityId?: string
  identityIndex?: number
  topUpIndex?: number
  changeIndex?: number
  corePlan?: CoreAssetLockPlan
  coreTransaction?: string
  assetLockTxid?: string
  assetLockProof?: AssetLockProof
  // Set once Platform rejected a transition on this asset lock: the next proof
  // must be a ChainLock one, since an InstantLock proof may have expired.
  chainLockProofOnly?: boolean
  stateTransition?: string
  stateTransitionHash?: string
  feeCredits?: string
  estimatedNetCredits?: string
  balanceCredits?: string
  status: 'prepared' | 'coreBroadcast' | 'proving' | 'platformBroadcast' | 'confirmed' | 'completed' | 'cancelled' | 'failed'
  error?: string
  createdAt: number
}
