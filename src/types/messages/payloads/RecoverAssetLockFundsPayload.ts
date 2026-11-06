import { ScopedPayload } from '../../../utils/validateRepositoryScopePayload'

export interface RecoverAssetLockFundsPayload extends ScopedPayload {
  // The funding address to drain, as listed by LIST_ASSET_LOCK_FUNDING_ADDRESSES.
  fundingAddress: string
  toAddress: string
  // Needed because the funding key is stored encrypted to a key derived from it.
  password: string
}
