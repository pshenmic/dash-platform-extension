import { ShieldedCachedAddress, ShieldedCachedNote } from '../../ShieldedCache'

// One account's shielded state as the last sync left it. Balances are strings
// (bigint does not serialize) and count unspent notes only. Reading it touches
// no network, so `poolTotal` is the pool size at sync time, not right now: with
// `updatedAt` it tells the caller how far behind the numbers may be.
export interface ShieldedCacheEntry {
  walletId: string
  account: number
  balance: string
  spendableNotes: number
  addresses: ShieldedCachedAddress[]
  notes: ShieldedCachedNote[]
  scannedNotes: number
  poolTotal: number
  // null when this wallet has never been synced.
  updatedAt: number | null
}

export interface GetShieldedCacheResponse extends ShieldedCacheEntry {}

export interface SyncShieldedCacheResponse {
  // One entry per wallet the sync covered, in wallet order. A wallet whose sync
  // failed carries the reason and the state it had before.
  wallets: Array<ShieldedCacheEntry & { error?: string }>
}
