import { WalletAccountInfo } from '../../types/messages/response/GetAllWalletsResponse'
import { Identity } from '../../types'
import { WalletType } from '../../types/WalletType'

export interface OutletContext {
  currentNetwork: string | null
  setCurrentNetwork: (network: string | null) => void
  currentWallet: string | null
  setCurrentWallet: (wallet: string | null) => void
  currentIdentity: string | null
  setCurrentIdentity: (identity: string | null) => void
  allWallets: WalletAccountInfo[]
  availableIdentities: Identity[]
  createWallet: (walletType: WalletType, mnemonic?: string) => Promise<{ walletId: string }>
}
