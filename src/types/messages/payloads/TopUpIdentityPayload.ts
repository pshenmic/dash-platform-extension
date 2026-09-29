import { NetworkType } from '../../NetworkType'

export interface TopUpIdentityPayload {
  identityId: string
  // Omit both, with an amount instead, to fund the asset lock from the wallet's
  // own Core coins rather than a deposit to a one-off address.
  assetLockFundingAddress?: string
  assetLockFundingTxid?: string
  password: string
  // Credits to lock when the wallet pays with its own coins; a deposit locks
  // whatever it received. Must be a whole number of duffs (1000 credits).
  amountCredits?: string
  // The (network, wallet) the top-up is bound to. Optional: callers that omit
  // them get the extension's current selection, snapshotted once when the
  // handler starts. A long-lived caller (the top-up tab, which stays open across
  // wallet and network switches) should always send them.
  walletId?: string
  network?: NetworkType
}
