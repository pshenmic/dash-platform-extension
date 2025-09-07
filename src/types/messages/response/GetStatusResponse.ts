export interface GetStatusResponse {
  network: string
  currentWalletId: string | null
  passwordSet: boolean
  ready: boolean
}
