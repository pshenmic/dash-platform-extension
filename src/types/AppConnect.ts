export interface AppConnect {
  id: string
  url: string
  status: 'pending' | 'approved' | 'rejected'
}
