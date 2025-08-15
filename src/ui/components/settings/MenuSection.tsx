import React from 'react'
import { Text, useTheme } from 'dash-ui/react'
import { MenuItem } from './MenuItem'
import type { MenuSection as MenuSectionType } from './types'

interface MenuSectionProps {
  section: MenuSectionType
  onItemClick: (itemId: string) => void
  isAccount?: boolean
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  section,
  onItemClick,
  isAccount = false
}) => {
  const { theme } = useTheme()
  return (
    <div className='menu-section mb-6'>
      {section.title && (
        <Text size='sm' weight='500' className={`mb-3 px-1 ${
          theme === 'dark' ? 'text-white/50' : 'text-[#0C1C33]/50'
        }`}>
          {section.title}
        </Text>
      )}

      <div className={`rounded-[1rem] overflow-hidden ${
        isAccount ? 'mb-4' : ''
      } ${
        theme === 'dark' && !isAccount ? 'border border-[rgba(255,255,255,0.15)]' : ''
      }`}
      >
        {section.items.map((item) => (
          <MenuItem
            key={item.id}
            title={item.title}
            description={item.description}
            icon={item.icon}
            hasSubMenu={item.hasSubMenu}
            danger={item.danger}
            isAccount={isAccount}

            onClick={() => onItemClick(item.id)}
          />
        ))}
      </div>
    </div>
  )
}
