export interface ConnectAppResponse {
  redirectUrl: string
  status: 'pending' | 'approved' | 'rejected' | 'error'
  identities: string[]
  currentIdentity: string | null
}
