import { ScopedPayload } from '../../../utils/validateRepositoryScopePayload'

export interface ListAssetLockFundingAddressesPayload extends ScopedPayload {
  // Reads the balance of every address from the Core explorer. Left off, the
  // answer is storage-only - which is all the settings menu needs.
  withBalances?: boolean
}
