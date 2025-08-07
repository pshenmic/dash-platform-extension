import React from 'react'
import { Text } from 'dash-ui/react'
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
  return (
    <div className='mb-6'>
      {section.title && (
        <Text size='sm' weight='500' className='mb-3 text-[#0C1C33]/50 px-1'>
          {section.title}
        </Text>
      )}

      <div className={`rounded-[15px] overflow-hidden ${
        isAccount ? 'mb-4' : 'bg-white/[0.03]'
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
