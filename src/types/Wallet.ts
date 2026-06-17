import { WalletType } from './WalletType'
import type { NetworkType } from './NetworkType'

export interface Wallet {
  walletId: string
  type: WalletType
  network: NetworkType
  label: string | null
  encryptedMnemonic: string | null
  seedHash: string | null
  currentIdentity: string | null
}
