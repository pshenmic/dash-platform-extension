import { WalletType } from './WalletType'

export interface Wallet {
  walletId: string
  type: WalletType
  network: string
  label: string | null
  currentIdentity: string | null
}
