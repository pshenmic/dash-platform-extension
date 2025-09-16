import type { NetworkType, Identity } from '../../../types'
import type { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'

export interface LayoutContext {
  currentNetwork: NetworkType
  setCurrentNetwork: (network: NetworkType) => Promise<void>
  currentWallet: string | null
  setCurrentWallet: (walletId: string | null) => Promise<void>
  currentIdentity: string | null
  setCurrentIdentity: (identity: string) => Promise<void>
  allWallets: WalletAccountInfo[]
  availableIdentities: Identity[]
  createWallet: (walletType: any, mnemonic?: string) => Promise<any>
}
