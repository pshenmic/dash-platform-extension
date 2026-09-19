import React from 'react'
import { Text, ValueCard, DashLogo, DocumentIcon, WebIcon } from 'dash-ui-kit/react'
import { MenuSection } from '../MenuSection'
import { EXTENSION_REPO_URL, DASH_WEBSITE_URL } from '../../../constants'
import type { SettingsScreenProps, ScreenConfig, MenuSection as MenuSectionType } from '../types'

const ICON_CLASS = '!text-dash-primary-dark-blue w-4 h-4'

// Menu item id -> external url opened on click.
const LINKS: Record<string, string> = {
  website: DASH_WEBSITE_URL,
  github: EXTENSION_REPO_URL
}

const sections: MenuSectionType[] = [
  {
    id: 'links',
    title: 'Links',
    items: [
      {
        id: 'website',
        title: 'Dash.org',
        icon: <WebIcon size={16} className={ICON_CLASS} />,
        external: true
      },
      {
        id: 'github',
        title: 'Source Code',
        icon: <DocumentIcon className={ICON_CLASS} />,
        external: true
      }
    ]
  }
]

export const aboutScreenConfig: ScreenConfig = {
  id: 'about-dash',
  title: 'About Dash Extension',
  category: 'other',
  content: sections
}

// Popup runs inside the extension, so the manifest is the single source of truth for the version.
const getExtensionVersion = (): string => {
  try {
    return chrome.runtime.getManifest().version
  } catch {
    return '-'
  }
}

export const AboutScreen: React.FC<SettingsScreenProps> = () => {
  const handleItemClick = (itemId: string): void => {
    const url = LINKS[itemId]
    if (url === undefined) return

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col items-center text-center gap-2 py-4'>
        <DashLogo />
        <Text size='lg' weight='medium' className='text-dash-primary-dark-blue'>
          Dash Platform Extension
        </Text>
        <Text size='sm' dim className='text-dash-primary-dark-blue'>
          Version {getExtensionVersion()}
        </Text>
      </div>

      <ValueCard colorScheme='lightGray'>
        <Text size='sm' className='text-dash-primary-dark-blue leading-relaxed'>
          A browser extension wallet for Dash Platform: identity management, wallet
          functionality and transaction signing for decentralized applications.
        </Text>
      </ValueCard>

      <div className='menu-sections-container'>
        {sections.map((section) => (
          <MenuSection
            key={section.id}
            section={section}
            onItemClick={handleItemClick}
          />
        ))}
      </div>

      <Text size='xs' dim className='text-dash-primary-dark-blue text-center'>
        Open source software provided as is, without warranty.
      </Text>
    </div>
  )
}
