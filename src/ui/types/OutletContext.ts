import { WalletAccountInfo } from '../../types/messages/response/GetAllWalletsResponse'
import { Identity } from '../../types'
import { WalletType } from '../../types/WalletType'

export interface OutletContext {
  selectedNetwork: string | null
  setSelectedNetwork: (network: string | null) => void
  selectedWallet: string | null
  setSelectedWallet: (wallet: string | null) => void
  currentIdentity: string | null
  setCurrentIdentity: (identity: string | null) => void
  allWallets: WalletAccountInfo[]
  availableIdentities: Identity[]
  createWallet: (walletType: WalletType, mnemonic?: string) => Promise<{ walletId: string }>
}
