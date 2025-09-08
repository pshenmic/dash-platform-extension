import React from 'react'
import { MenuSection } from '../MenuSection'
import type { SettingsScreenProps } from '../types'
import { KeyIcon } from 'dash-ui-kit/react'

export const SecuritySettingsScreen: React.FC<SettingsScreenProps> = () => {
  const handleItemClick = (itemId: string): void => {
    console.log(`Security settings action: ${itemId}`)
    // TODO: Implement actions for each menu item
  }

  const sections = [
    {
      id: 'password',
      title: 'Password & Authentication',
      items: [
        {
          id: 'change-password',
          title: 'Change Password',
          icon: <KeyIcon />
        }
      ]
    }
  ]

  return (
    <div className='menu-sections-container'>
      {sections.map((section) => (
        <MenuSection
          key={section.id}
          section={section}
          onItemClick={handleItemClick}
        />
      ))}
    </div>
  )
}
