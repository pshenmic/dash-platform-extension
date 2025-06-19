export interface GetStatusResponse {
  network: string
  currentWalletId: string | null
  currentIdentity: string | null
  passwordSet: boolean
}
