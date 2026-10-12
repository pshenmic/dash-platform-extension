import { ShieldedNote, ShieldedStoredAddress, ShieldedSyncPhase } from '../../ShieldedNotes'

// One account's shielded state as the last sync left it. Balances are strings
// (bigint does not serialize) and count unspent notes only. Reading it touches
// no network, so `total` is the pool size at sync time, not right now: with
// `updatedAt` it tells the caller how far behind the numbers may be.
export interface ShieldedSyncState {
  walletId: string
  network: string
  account: number
  // 'syncing' while a sync of this wallet is running, so a UI that reopens can
  // tell a running sync from one that never happened.
  phase: ShieldedSyncPhase
  balance: string
  spendableNotes: number
  addresses: ShieldedStoredAddress[]
  notes: ShieldedNote[]
  fetched: number
  total: number
  // null when this wallet has never been synced.
  updatedAt: number | null
}

export interface GetShieldedSyncStateResponse extends ShieldedSyncState {}

export interface SyncShieldedNotesResponse {
  // One entry per wallet the sync covered, in wallet order. A wallet whose sync
  // failed carries the reason and the state it had before.
  wallets: Array<ShieldedSyncState & { error?: string }>
}
