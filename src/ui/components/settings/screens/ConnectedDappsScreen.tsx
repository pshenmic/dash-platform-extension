import React from 'react'
import { Text, Button } from 'dash-ui/react'
import type { SettingsScreenProps } from '../types'

const DappIcon: React.FC = () => (
  <svg width='40' height='40' viewBox='0 0 40 40' fill='none'>
    <rect width='40' height='40' rx='8' fill='#F0F0F0' />
    <circle cx='20' cy='20' r='12' fill='#4095BF' />
    <path d='M15 20l3 3 7-7' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

export const ConnectedDappsScreen: React.FC<SettingsScreenProps> = () => {
  const connectedDapps = [
    {
      id: 'example-dapp',
      name: 'Example DApp',
      url: 'https://example-dapp.com',
      permissions: ['Read wallet address', 'Request transactions'],
      lastUsed: '2 hours ago'
    }
  ]

  const handleDisconnect = (dappId: string): void => {
    console.log(`Disconnect dapp: ${dappId}`)
    // TODO: Implement disconnect logic
  }

  if (connectedDapps.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[200px] text-center'>
        <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4'>
          <svg width='24' height='24' viewBox='0 0 24 24' fill='none'>
            <path d='M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z' stroke='#9CA3AF' strokeWidth='1.5' />
          </svg>
        </div>
        <Text size='lg' weight='medium' className='text-gray-600 mb-2'>
          No Connected DApps
        </Text>
        <Text size='sm' className='text-gray-500'>
          When you connect to DApps, they will appear here
        </Text>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <Text size='sm' className='text-gray-600 mb-4'>
        Manage your connected decentralized applications
      </Text>

      {connectedDapps.map((dapp) => (
        <div
          key={dapp.id}
          className='bg-white/[0.03] rounded-[15px] p-4 border border-gray-100'
        >
          <div className='flex items-start gap-4'>
            <DappIcon />

            <div className='flex-1'>
              <div className='flex items-center justify-between mb-2'>
                <Text size='base' weight='medium' className='text-[#0C1C33]'>
                  {dapp.name}
                </Text>
                <Button
                  size='sm'
                  variant='outline'
                  colorScheme='red'
                  onClick={() => handleDisconnect(dapp.id)}
                >
                  Disconnect
                </Button>
              </div>

              <Text size='xs' className='text-gray-500 mb-2'>
                {dapp.url}
              </Text>

              <Text size='xs' className='text-gray-400 mb-3'>
                Last used: {dapp.lastUsed}
              </Text>

              <div>
                <Text size='xs' weight='medium' className='text-gray-600 mb-1'>
                  Permissions:
                </Text>
                <div className='space-y-1'>
                  {dapp.permissions.map((permission, index) => (
                    <Text key={index} size='xs' className='text-gray-500'>
                      • {permission}
                    </Text>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
