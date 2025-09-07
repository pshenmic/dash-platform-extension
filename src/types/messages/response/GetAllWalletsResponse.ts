export interface WalletAccountInfo {
  walletId: string
  type: string
  network: string
  label: string | null
}

export interface GetAllWalletsResponse {
  wallets: WalletAccountInfo[]
}
