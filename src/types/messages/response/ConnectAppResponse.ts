import { IdentityInfo } from '../../IdentityInfo'

export interface ConnectAppResponse {
  identities: IdentityInfo[]
  currentIdentity: string | null
  network: string
}
