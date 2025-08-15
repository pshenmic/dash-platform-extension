import React from 'react'
import { Text, Button } from 'dash-ui/react'
import type { SettingsScreenProps } from '../types'

const DashLogo: React.FC = () => (
  <svg width='60' height='48' viewBox='0 0 60 48' fill='none'>
    <path d='M51.1 0H8.9L0 19.4h30.4L40.75 0H51.1Z' fill='#008DE4' />
    <path d='M8.9 48H51.1L60 28.6H29.6L19.25 48H8.9Z' fill='#008DE4' />
  </svg>
)

export const AboutScreen: React.FC<SettingsScreenProps> = () => {
  const handleOpenWebsite = (): void => {
    window.open('https://www.dash.org/', '_blank')
  }

  const handleOpenGitHub = (): void => {
    window.open('https://github.com/dashpay/dash-platform-extension', '_blank')
  }

  const handleOpenLicense = (): void => {
    window.open('https://github.com/dashpay/dash-platform-extension/blob/main/LICENSE', '_blank')
  }

  return (
    <div className='space-y-6'>
      {/* Logo and App Info */}
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

      {/* Description */}
      <div className='bg-white/[0.03] rounded-[15px] p-4'>
        <Text size='sm' className='text-gray-700 leading-relaxed'>
          Dash Platform Extension is a browser extension wallet that provides secure
          identity management, wallet functionality, and transaction signing capabilities
          for decentralized applications on the Dash Platform.
        </Text>
      </div>

      {/* Links */}
      <div className='space-y-3'>
        <Button
          variant='outline'
          className='w-full justify-start'
          onClick={handleOpenWebsite}
        >
          <Text size='sm'>Visit Dash.org</Text>
        </Button>

        <Button
          variant='outline'
          className='w-full justify-start'
          onClick={handleOpenGitHub}
        >
          <Text size='sm'>View on GitHub</Text>
        </Button>

        <Button
          variant='outline'
          className='w-full justify-start'
          onClick={handleOpenLicense}
        >
          <Text size='sm'>License (MIT)</Text>
        </Button>
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
