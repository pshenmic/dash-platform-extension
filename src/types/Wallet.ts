import { WalletType } from './WalletType'

export interface Wallet {
  walletId: string
  walletType: WalletType
  network: string
  label: string | null
  encryptedMnemonic: string | null
}
