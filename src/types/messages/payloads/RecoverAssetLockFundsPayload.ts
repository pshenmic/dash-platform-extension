import { ScopedPayload } from '../../../utils/validateRepositoryScopePayload'

export interface RecoverAssetLockFundsPayload extends ScopedPayload {
  // The funding address to spend, as listed by LIST_RECOVERABLE_ASSET_LOCK_FUNDS.
  fundingAddress: string
  toAddress: string
  // Needed because the funding key is stored encrypted to a key derived from it.
  password: string
  // Omitted, or `sendMax` true, pays out everything the address holds less the
  // fee and leaves it empty.
  amountDuffs?: string
  sendMax?: boolean
}
