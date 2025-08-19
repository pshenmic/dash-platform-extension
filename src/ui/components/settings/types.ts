export interface MenuItem {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  action?: () => void
  hasSubMenu?: boolean
  danger?: boolean
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
}

export interface ScreenConfig {
  id: string
  title: string
  icon?: React.ReactNode
  description?: string
  category?: 'account' | 'wallet' | 'other'
  order?: number
  content: MenuSection[]
}
