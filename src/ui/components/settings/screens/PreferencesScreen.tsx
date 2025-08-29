import React from 'react'
import { MenuSection } from '../MenuSection'
import type { SettingsScreenProps, ScreenConfig } from '../types'

export const preferencesScreenConfig: ScreenConfig = {
  id: 'preferences',
  title: 'Preferences',
  category: 'wallet',
  content: [
    {
      id: 'display',
      title: 'Display',
      items: [
        {
          id: 'currency',
          title: 'Primary Currency'
        },
        {
          id: 'language',
          title: 'Language'
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      items: [
        {
          id: 'push-notifications',
          title: 'Push Notifications'
        }
      ]
    }
  ]
}

export const PreferencesScreen: React.FC<SettingsScreenProps> = () => {
  const handleItemClick = (itemId: string): void => {
    console.log(`Preferences action: ${itemId}`)
    // TODO: Implement actions for each preference item
  }

  return (
    <div className='menu-sections-container'>
      {preferencesScreenConfig.content.map((section) => (
        <MenuSection
          key={section.id}
          section={section}
          onItemClick={handleItemClick}
        />
      ))}
    </div>
  )
}
