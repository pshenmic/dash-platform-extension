import React from 'react'
import { Text, DocumentIcon, QuestionMessageIcon, WebIcon, ProtectedMessageIcon, AirplaneIcon, FaceIcon } from 'dash-ui-kit/react'
import { MenuSection } from '../MenuSection'
import {
  DASH_DOCS_URL,
  DASH_DISCORD_URL,
  DASH_TELEGRAM_URL,
  DASH_TWITTER_URL,
  DASH_REDDIT_URL,
  EXTENSION_ISSUES_URL
} from '../../../constants'
import type { SettingsScreenProps, ScreenConfig, MenuSection as MenuSectionType } from '../types'

const ICON_CLASS = '!text-dash-primary-dark-blue w-4 h-4'

// Menu item id -> external url opened on click.
const LINKS: Record<string, string> = {
  'user-guide': DASH_DOCS_URL,
  'report-bug': EXTENSION_ISSUES_URL,
  discord: DASH_DISCORD_URL,
  telegram: DASH_TELEGRAM_URL,
  twitter: DASH_TWITTER_URL,
  reddit: DASH_REDDIT_URL
}

const sections: MenuSectionType[] = [
  {
    id: 'help-resources',
    title: 'Help Resources',
    items: [
      {
        id: 'user-guide',
        title: 'Documentation',
        icon: <DocumentIcon className={ICON_CLASS} />,
        external: true
      },
      {
        id: 'report-bug',
        title: 'Report a Bug',
        icon: <QuestionMessageIcon className={ICON_CLASS} />,
        external: true
      }
    ]
  },
  {
    id: 'community',
    title: 'Community',
    items: [
      {
        id: 'discord',
        title: 'Discord',
        icon: <ProtectedMessageIcon className={ICON_CLASS} />,
        external: true
      },
      {
        id: 'telegram',
        title: 'Telegram',
        icon: <AirplaneIcon className={ICON_CLASS} />,
        external: true
      },
      {
        id: 'twitter',
        title: 'X (Twitter)',
        icon: <WebIcon size={16} className={ICON_CLASS} />,
        external: true
      },
      {
        id: 'reddit',
        title: 'Reddit',
        icon: <FaceIcon className={ICON_CLASS} />,
        external: true
      }
    ]
  }
]

export const helpSupportScreenConfig: ScreenConfig = {
  id: 'help-support',
  title: 'Help and Support',
  category: 'other',
  content: sections
}

export const HelpSupportScreen: React.FC<SettingsScreenProps> = () => {
  const handleItemClick = (itemId: string): void => {
    const url = LINKS[itemId]
    if (url === undefined) return

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className='flex flex-col gap-4'>
      <Text size='sm' dim className='text-dash-primary-dark-blue'>
        Find answers, report issues or reach the Dash community.
      </Text>

      <div className='menu-sections-container'>
        {sections.map((section) => (
          <MenuSection
            key={section.id}
            section={section}
            onItemClick={handleItemClick}
          />
        ))}
      </div>
    </div>
  )
}
