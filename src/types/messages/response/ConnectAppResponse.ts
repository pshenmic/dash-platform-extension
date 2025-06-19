export interface ConnectAppResponse {
  redirectUrl: string
  status: 'pending' | 'approved' | 'rejected'
}
