import { ScopedPayload } from '../../../utils/validateRepositoryScopePayload'

export interface ListRecoverableAssetLockFundsPayload extends ScopedPayload {
  // Reads the balance of every candidate from the Core explorer. Left off, the
  // answer is storage-only, which is what the settings menu asks for: it only
  // needs to know whether there is anything to show, and must not fire a request
  // per address every time it opens.
  withBalances?: boolean
}
