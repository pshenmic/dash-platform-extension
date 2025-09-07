import React from 'react'
import { Text, Button, DashLogo } from 'dash-ui-kit/react'
import type { SettingsScreenProps } from '../types'

export const AboutScreen: React.FC<SettingsScreenProps> = () => {
  return (
    <div className='menu-sections-container'>
      <div className='text-center py-6'>
        <div className='flex justify-center mb-4'>
          <DashLogo />
        </div>
        <Text size='xl' weight='600' className='text-[#0C1C33] mb-2'>
          Dash Platform Extension
        </Text>
        <Text size='sm' className='text-gray-600 mb-1'>
          Version 0.1.0
        </Text>
        <Text size='sm' className='text-gray-500'>
          A secure wallet for Dash Platform
        </Text>
      </div>

      <div className='bg-white/[0.03] rounded-[15px] p-4'>
        <Text size='sm' className='text-gray-700 leading-relaxed'>
          Dash Platform Extension is a browser extension wallet that provides secure
          identity management, wallet functionality, and transaction signing capabilities
          for decentralized applications on the Dash Platform.
        </Text>
      </div>

      <div className='space-y-3'>
        <a
          href='https://dash.org/'
          target='_blank'
          rel='noopener noreferrer'
          className='block'
        >
          <Button
            variant='outline'
            className='w-full justify-start'
          >
            <Text size='sm'>Visit Dash.org</Text>
          </Button>
        </a>

        <a
          href='https://github.com/pshenmic/dash-platform-extension'
          target='_blank'
          rel='noopener noreferrer'
          className='block'
        >
          <Button
            variant='outline'
            className='w-full justify-start'
          >
            <Text size='sm'>View on GitHub</Text>
          </Button>
        </a>
      </div>

      {/* Legal */}
      <div className='pt-4 border-t border-gray-200'>
        <Text size='xs' className='text-gray-500 text-center'>
          © 2024 Dash Core Group. All rights reserved.
        </Text>
        <Text size='xs' className='text-gray-500 text-center mt-1'>
          This software is provided 'as is' without warranty.
        </Text>
      </div>
    </div>
  )
}
