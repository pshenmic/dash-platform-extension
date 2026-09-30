import { NetworkType } from '../../NetworkType'

export interface TopUpIdentityPayload {
  identityId: string
  // Either a one-off deposit address this extension handed out, or one of the
  // wallet's own Core addresses - then its key comes from the seed and the caller
  // picks which coins to spend (LIST_CORE_UTXOS shows them).
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
