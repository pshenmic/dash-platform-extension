import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'
import { NetworkType } from '../../../types'

export interface MenuItem {
  id: string
  title: string | React.ReactNode
  icon?: React.ReactNode
  screenId?: string
  onAction?: () => void
  hasSubMenu?: boolean
  disabled?: boolean
  control?: React.ReactNode
  external?: boolean
}

export interface MenuSection {
  id: string
  title: string
  items: MenuItem[]
}

export interface SettingsScreenProps {
  onBack: () => void
  onClose: () => void
  onItemSelect?: (itemId: string) => void
  currentIdentity?: string | null
  currentNetwork?: NetworkType | null
  setCurrentNetwork?: (network: NetworkType) => Promise<void>
  currentWallet?: WalletAccountInfo | null
}

export interface ScreenConfig {
  id: string
  title: string
  icon?: React.ReactNode
  description?: string
  category?: 'account' | 'wallet' | 'other'
  content: MenuSection[]
}
