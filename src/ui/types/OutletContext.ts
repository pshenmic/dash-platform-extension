import React from 'react'
import { WalletAccountInfo } from '../../types/messages/response/GetAllWalletsResponse'
import { Identity, WalletType } from '../../types'

export interface HeaderConfigOverride {
  showBackButton?: boolean
  imageType?: 'coins' | 'app' | 'userChain' | 'warning'
  imageClasses?: string
  containerClasses?: string
}

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
  headerComponent: React.ReactNode
  setHeaderComponent: (component: React.ReactNode) => void
  headerConfigOverride: HeaderConfigOverride | null
  setHeaderConfigOverride: (config: HeaderConfigOverride | null) => void
}
