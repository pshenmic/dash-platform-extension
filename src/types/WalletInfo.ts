import { IdentityInfo } from './IdentityInfo'

export interface WalletInfo {
  identities: IdentityInfo[]
  currentIdentity: string | null
  // The network the wallet is on when the connection is approved. Later changes
  // reach the site through the `networkChanged` event, not through this value.
  network: string | null
}
