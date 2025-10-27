import { IdentityInfo } from './IdentityInfo'

export interface WalletInfo {
  identities: IdentityInfo[]
  currentIdentity: string | null
}
