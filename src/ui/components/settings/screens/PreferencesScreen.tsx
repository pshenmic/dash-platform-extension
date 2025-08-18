import React from 'react'
import { MenuSection } from '../MenuSection'
import type { SettingsScreenProps, ScreenConfig } from '../types'

const CurrencyIcon: React.FC = () => (
  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
    <circle cx='10' cy='10' r='8' stroke='currentColor' strokeWidth='1.5' />
    <path d='M10 6v8M7 8h3.5a1.5 1.5 0 0 1 0 3H7M7 12h3.5a1.5 1.5 0 0 0 0-3H7' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
  </svg>
)

const LanguageIcon: React.FC = () => (
  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
    <circle cx='10' cy='10' r='8' stroke='currentColor' strokeWidth='1.5' />
    <path d='M2 10h16M10 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' stroke='currentColor' strokeWidth='1.5' />
  </svg>
)

const NotificationIcon: React.FC = () => (
  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
    <path d='M10 2a6 6 0 0 1 6 6c0 7 3 9 3 9H1s3-2 3-9a6 6 0 0 1 6-6Z' stroke='currentColor' strokeWidth='1.5' />
    <path d='M7.73 18a2 2 0 0 0 3.54 0' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
  </svg>
)

// Конфигурация экрана Preferences
export const preferencesScreenConfig: ScreenConfig = {
  id: 'preferences',
  title: 'Preferences',
  category: 'wallet',
  order: 1,
  content: [
    {
      id: 'display',
      title: 'Display',
      items: [
        {
          id: 'currency',
          title: 'Primary Currency',
          description: 'USD',
          icon: <CurrencyIcon />
        },
        {
          id: 'language',
          title: 'Language',
          description: 'English',
          icon: <LanguageIcon />
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      items: [
        {
          id: 'push-notifications',
          title: 'Push Notifications',
          description: 'Get notified about transactions',
          icon: <NotificationIcon />
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
    <div className='space-y-6'>
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
