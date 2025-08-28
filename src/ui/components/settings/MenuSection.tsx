import React from 'react'
import { Text, useTheme } from 'dash-ui/react'
import { MenuItem } from './MenuItem'
import type { MenuSection as MenuSectionType } from './types'

interface MenuSectionProps {
  section: MenuSectionType
  onItemClick: (itemId: string) => void
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  section,
  onItemClick
}) => {
  const { theme } = useTheme()
  return (
    <div className='menu-section mb-6'>
      {section.title !== '' && (
        <Text
          size='sm' weight='500' className={`mb-3 px-1 ${theme === 'dark' ? 'text-white/50' : 'text-dash-primary-dark-blue/50'}`}
        >
          {section.title}
        </Text>
      )}

      <div className={`rounded-[1rem] overflow-hidden`}
      >
        {section.items.map((item) => (
          <MenuItem
            key={item.id}
            title={item.title}
            icon={item.icon}
            hasSubMenu={item.hasSubMenu}
            disabled={item.disabled}
            onClick={() => {
              // Don't execute anything if disabled
              if (item.disabled === true) {
                return
              }

              // Priority: onAction over navigation
              if (item.onAction != null) {
                item.onAction()
              } else {
                onItemClick(item.id)
              }
            }}
          />
        ))}
      </div>
    </div>
  )
}
