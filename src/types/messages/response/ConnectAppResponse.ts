import { IdentityInfo } from '../../IdentityInfo'

export interface ConnectAppResponse {
  redirectUrl: string
  status: 'pending' | 'approved' | 'rejected' | 'error'
  identities: IdentityInfo[]
  currentIdentity: string | null
  network: string
}
