import { NetworkType } from '../../NetworkType'

export interface TopUpIdentityPayload {
  identityId: string
  assetLockFundingAddress: string
  assetLockFundingTxid: string
  password: string
  // The (network, wallet) the top-up is bound to. Optional: callers that omit
  // them get the extension's current selection, snapshotted once when the
  // handler starts. A long-lived caller (the top-up tab, which stays open across
  // wallet and network switches) should always send them.
  walletId?: string
  network?: NetworkType
}
