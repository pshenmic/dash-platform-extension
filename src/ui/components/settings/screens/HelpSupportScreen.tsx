import React from 'react'
import { MenuSection } from '../MenuSection'
import type { SettingsScreenProps, ScreenConfig } from '../types'

const DocumentIcon: React.FC = () => (
  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
    <path d='M12 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z' stroke='currentColor' strokeWidth='1.5' />
    <path d='M12 2v6h6' stroke='currentColor' strokeWidth='1.5' />
  </svg>
)

const MessageIcon: React.FC = () => (
  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
    <path d='M18 2H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3l3 3 3-3h7a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z' stroke='currentColor' strokeWidth='1.5' />
  </svg>
)

const BugIcon: React.FC = () => (
  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
    <path d='M10 2a4 4 0 0 1 4 4v2h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2v2a4 4 0 0 1-8 0v-2H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h2V6a4 4 0 0 1 4-4z' stroke='currentColor' strokeWidth='1.5' />
    <path d='M6 9v2M14 9v2M10 14v2' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
  </svg>
)

const DiscordIcon: React.FC = () => (
  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
    <path d='M16.5 3.5c-1.2-.5-2.5-.9-3.9-1.1-.2.3-.4.7-.5 1-1.4-.2-2.8-.2-4.2 0-.1-.3-.3-.7-.5-1-1.4.2-2.7.6-3.9 1.1C.8 7.5.3 11.4.7 15.3c1.6 1.2 3.1 1.9 4.6 2.4.4-.5.7-1 1-1.6-.5-.2-1-.4-1.4-.7l.3-.2c2.8 1.3 5.8 1.3 8.6 0l.3.2c-.4.3-.9.5-1.4.7.3.6.6 1.1 1 1.6 1.5-.5 3-1.2 4.6-2.4.5-4.5-.8-8.4-3.3-11.8zM6.7 12.8c-1 0-1.9-.9-1.9-2s.8-2 1.9-2c1 0 1.9.9 1.9 2s-.8 2-1.9 2zm6.6 0c-1 0-1.9-.9-1.9-2s.8-2 1.9-2c1 0 1.9.9 1.9 2s-.8 2-1.9 2z' fill='currentColor' />
  </svg>
)

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
          title: 'User Guide',
          icon: <DocumentIcon />
        },
        {
          id: 'contact-support',
          title: 'Contact Support',
          icon: <MessageIcon />
        }
      ]
    },
    {
      id: 'feedback',
      title: 'Feedback',
      items: [
        {
          id: 'report-bug',
          title: 'Report a Bug',
          icon: <BugIcon />
        }
      ]
    },
    {
      id: 'community',
      title: 'Community',
      items: [
        {
          id: 'discord',
          title: 'Join Discord',
          icon: <DiscordIcon />
        }
      ]
    }
  ]
}

export const HelpSupportScreen: React.FC<SettingsScreenProps> = () => {
  const handleItemClick = (itemId: string): void => {
    console.log(`Help & Support action: ${itemId}`)

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
        window.open('https://discord.gg/dash', '_blank')
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
