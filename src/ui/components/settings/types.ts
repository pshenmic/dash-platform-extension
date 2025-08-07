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
}
