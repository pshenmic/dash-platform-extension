import { NetworkType } from '../../NetworkType'

export interface SyncShieldedNotesPayload {
  password: string
  // Defaults to account 0.
  account?: number
  // Defaults to every seedphrase wallet of the networks below.
  walletId?: string
  // Defaults to both networks: the UI syncs once on unlock and can then switch
  // networks without a second sync.
  network?: NetworkType
}
