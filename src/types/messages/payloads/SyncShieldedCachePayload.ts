export interface SyncShieldedCachePayload {
  password: string
  // Defaults to account 0.
  account?: number
  // Defaults to every seedphrase wallet on the current network.
  walletId?: string
}
