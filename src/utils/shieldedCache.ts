import { ShieldedAccountCache } from '../types/ShieldedCache'
import { ShieldedCacheEntry } from '../types/messages/response/GetShieldedCacheResponse'

// An account with nothing cached yet: the shape callers get before the first
// sync, so a UI never has to special-case a missing wallet.
export const emptyShieldedCache = (account: number): ShieldedAccountCache => ({
  account,
  addresses: [],
  notes: [],
  scannedNotes: 0,
  poolTotal: 0,
  updatedAt: 0
})

// Turns a stored account into the response, summing the notes still unspent.
export const shieldedCacheResponse = (walletId: string, cache: ShieldedAccountCache, synced: boolean): ShieldedCacheEntry => {
  const unspent = cache.notes.filter(note => !note.isSpent)

  return {
    walletId,
    account: cache.account,
    balance: unspent.reduce((total, note) => total + BigInt(note.value), 0n).toString(),
    spendableNotes: unspent.length,
    addresses: cache.addresses,
    notes: cache.notes,
    scannedNotes: cache.scannedNotes,
    poolTotal: cache.poolTotal,
    updatedAt: synced ? cache.updatedAt : null
  }
}

export const validateShieldedCacheAccount = (account?: number): string | null => {
  if (account != null && (!Number.isInteger(account) || account < 0)) {
    return 'Account must be a non-negative integer'
  }

  return null
}
