// A note of this wallet, recovered from the shielded pool and kept in storage so
// the UI can show shielded funds without the password. Values cross the
// messaging boundary and are stored as strings (bigint does not serialize).
export interface ShieldedCachedNote {
  // Global leaf position of the note's action in the commitment tree.
  index: number
  value: string
  address: string
  // Derivation index of the address, or null for a note paid to an address
  // outside the wallet's generated window.
  diversifierIndex: number | null
  // hex
  nullifier: string
  isSpent: boolean
}

export interface ShieldedCachedAddress {
  address: string
  derivationPath: string
  diversifierIndex: number
}

// One account's shielded state as of the last sync.
export interface ShieldedAccountCache {
  account: number
  addresses: ShieldedCachedAddress[]
  notes: ShieldedCachedNote[]
  // How many pool notes have been trial-decrypted so far. The pool only grows at
  // the end, so this doubles as the offset the next sync starts from.
  scannedNotes: number
  // Size of the pool at that moment, so a caller can tell how far behind it is.
  poolTotal: number
  updatedAt: number
}

export interface ShieldedWalletCache {
  [account: string]: ShieldedAccountCache
}
