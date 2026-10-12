import { NetworkType } from '../../NetworkType'

export interface GetShieldedSyncStatePayload {
  // Defaults to account 0.
  account?: number
  // Defaults to the selected wallet.
  walletId?: string
  // Defaults to the selected network; the other one is readable without
  // switching, since both are synced.
  network?: NetworkType
}
