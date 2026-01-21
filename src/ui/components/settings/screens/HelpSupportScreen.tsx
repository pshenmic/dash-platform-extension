import React from 'react'
import { MenuSection } from '../MenuSection'
import type { SettingsScreenProps, ScreenConfig } from '../types'

export const helpSupportScreenConfig: ScreenConfig = {
  id: 'help-support',
  title: 'Help and Support',
  category: 'other',
  content: [
    {
      id: 'help-resources',
      title: 'Help Resources',
      items: [
        {
          id: 'user-guide',
          title: 'User Guide'
        },
        {
          id: 'contact-support',
          title: 'Contact Support'
        }
      ]
    },
    {
      id: 'feedback',
      title: 'Feedback',
      items: [
        {
          id: 'report-bug',
          title: 'Report a Bug'
        }
      ]
    },
    {
      id: 'community',
      title: 'Community',
      items: [
        {
          id: 'discord',
          title: 'Join Discord'
        }
      ]
    }
  ]
}

export const HelpSupportScreen: React.FC<SettingsScreenProps> = () => {
  const handleItemClick = (itemId: string): void => {
    switch (itemId) {
      case 'user-guide':
        window.open('https://docs.dash.org/', '_blank')
        break
      case 'contact-support':
        window.open('mailto:support@dash.org', '_blank')
        break
      case 'report-bug':
        window.open('https://github.com/dashpay/dash-platform-extension/issues', '_blank')
        break
      case 'discord':
        window.open('https://discordapp.com/invite/PXbUxJB', '_blank')
        break
      default:
        console.log(`Unknown action: ${itemId}`)
    }
  }

  return (
    <div className='menu-sections-container'>
      {helpSupportScreenConfig.content.map((section) => (
        <MenuSection
          key={section.id}
          section={section}
          onItemClick={handleItemClick}
        />
      ))}
    </div>
  )
}
