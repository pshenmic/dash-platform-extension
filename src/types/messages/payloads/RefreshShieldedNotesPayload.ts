import { NetworkType } from '../../NetworkType'

// No password: only what can be updated without the seed is refreshed.
export interface RefreshShieldedNotesPayload {
  // Defaults to account 0.
  account?: number
  // Defaults to every wallet that has notes stored.
  walletId?: string
  // Defaults to both networks.
  network?: NetworkType
}
