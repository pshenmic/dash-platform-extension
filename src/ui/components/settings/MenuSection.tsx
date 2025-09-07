import React from 'react'
import { Text } from 'dash-ui-kit/react'
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
  return (
    <div className='flex flex-col gap-3'>
      {section.title !== '' && (
        <Text
          dim
          size='sm'
          weight='500'
          className='text-dash-primary-dark-blue/50'
        >
          {section.title}
        </Text>
      )}

      <div className='rounded-[1rem] overflow-hidden'>
        {section.items.map((item) => (
          <MenuItem
            key={item.id}
            title={item.title}
            icon={item.icon}
            hasSubMenu={item.hasSubMenu}
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled === true) return

              if (item.onAction != null) {
                item.onAction()
                return
              }

              onItemClick(item.id)
            }}
          />
        ))}
      </div>
    </div>
  )
}
