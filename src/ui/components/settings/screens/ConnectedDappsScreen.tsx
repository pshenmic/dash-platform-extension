import React from 'react'
import { Text, useTheme } from 'dash-ui/react'
import type { SettingsScreenProps } from '../types'

// Icons for different DApps
const WebIcon: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme = 'light' }) => (
  <svg width='13.33' height='13.33' viewBox='0 0 14 14' fill='none'>
    <path d='M7 0.5C3.41 0.5 0.5 3.41 0.5 7C0.5 10.59 3.41 13.5 7 13.5C10.59 13.5 13.5 10.59 13.5 7C13.5 3.41 10.59 0.5 7 0.5ZM7 12.5C3.96 12.5 1.5 10.04 1.5 7C1.5 3.96 3.96 1.5 7 1.5C10.04 1.5 12.5 3.96 12.5 7C12.5 10.04 10.04 12.5 7 12.5Z' fill={theme === 'dark' ? '#FFFFFF' : '#0C1C33'} />
    <path d='M7 2.5C8.93 2.5 10.5 5.02 10.5 7C10.5 8.98 8.93 11.5 7 11.5C5.07 11.5 3.5 8.98 3.5 7C3.5 5.02 5.07 2.5 7 2.5Z' fill={theme === 'dark' ? '#FFFFFF' : '#0C1C33'} />
    <path d='M1.5 7H12.5' stroke={theme === 'dark' ? '#FFFFFF' : '#0C1C33'} strokeWidth='1' />
  </svg>
)

const PlatformExplorerIcon: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme = 'light' }) => (
  <svg width='35' height='34' viewBox='0 0 35 34' fill='none'>
    <rect width='35' height='34' rx='8' fill={theme === 'dark' ? '#FFFFFF' : '#4C7EFF'} />
    <path d='M10 17L15 22L25 12' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

export const ConnectedDappsScreen: React.FC<SettingsScreenProps> = () => {
  const { theme } = useTheme()
  const connectedDapps = [
    {
      id: 'dashcentral',
      name: 'dashcentral.org',
      url: 'dashcentral.org',
      icon: 'web'
    },
    {
      id: 'platform-explorer',
      name: 'Platform Explorer',
      url: 'platform-explorer.com',
      icon: 'platform'
    },
    {
      id: 'dash-org',
      name: 'dash.org',
      url: 'dash.org',
      icon: 'web'
    }
  ]

  const handleDisconnect = (dappId: string): void => {
    console.log(`Disconnect dapp: ${dappId}`)
    // TODO: Implement disconnect logic
  }

  const renderIcon = (iconType: string, dappName: string): React.JSX.Element => {
    const iconBgClass = iconType === 'platform' ? 'bg-[#4C7EFF]' : (theme === 'dark' ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-white')
    const iconSize = iconType === 'platform' ? 'w-[50px] h-[50px]' : 'w-[50px] h-[50px]'

    return (
      <div className={`${iconSize} ${iconBgClass} rounded-full flex items-center justify-center`}>
        {iconType === 'platform'
          ? (
            <PlatformExplorerIcon theme={theme} />
            )
          : (
            <WebIcon theme={theme} />
            )}
      </div>
    )
  }

  if (connectedDapps.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[200px] text-center'>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          theme === 'dark' ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-gray-100'
        }`}
        >
          <svg width='24' height='24' viewBox='0 0 24 24' fill='none'>
            <path d='M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z' stroke={theme === 'dark' ? '#FFFFFF' : '#9CA3AF'} strokeWidth='1.5' />
          </svg>
        </div>
        <Text size='lg' weight='medium' className={theme === 'dark' ? 'text-white/60' : 'text-gray-600'}>
          No Connected DApps
        </Text>
        <Text size='sm' className={theme === 'dark' ? 'text-white/50' : 'text-gray-500'}>
          When you connect to DApps, they will appear here
        </Text>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {/* Description */}
      <Text
        size='sm' weight='500' className={`mb-6 opacity-50 ${
        theme === 'dark' ? 'text-white' : 'text-[#0C1C33]'
      }`}
      >
        Manage dapps you have connected to.
      </Text>

      {/* DApp List */}
      <div className='space-y-[10px]'>
        {connectedDapps.map((dapp) => (
          <div
            key={dapp.id}
            className={`rounded-[15px] px-[15px] py-[10px] flex items-center justify-between ${
              theme === 'dark'
                ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.15)] backdrop-blur-[250px]'
                : 'bg-[rgba(12,28,51,0.03)]'
            }`}
          >
            <div className='flex items-center gap-[15px]'>
              {renderIcon(dapp.icon, dapp.name)}

              <div className='flex flex-col gap-[5px]'>
                <Text size='base' weight='500' className={theme === 'dark' ? 'text-white' : 'text-[#0C1C33]'}>
                  {dapp.name}
                </Text>
                {dapp.url !== dapp.name && (
                  <Text
                    size='xs' weight='300' className={`${
                    theme === 'dark' ? 'text-white/50' : 'text-[rgba(12,28,51,0.5)]'
                  }`} style={{ fontFamily: 'Space Grotesk' }}
                  >
                    {dapp.url}
                  </Text>
                )}
              </div>
            </div>

            <button
              className='bg-[#4C7EFF] hover:bg-[#3d6bff] text-white px-[12px] py-[7px] rounded-[10px] text-base font-medium hover:cursor-pointer transition-colors'
              onClick={() => handleDisconnect(dapp.id)}
            >
              Disconnect
            </button>
          </div>
        ))}
      </div>

      {/* Disconnect All Button */}
      <div className='mt-6'>
        <button
          className={`w-full rounded-[15px] px-[24px] py-[12px] text-base font-medium hover:cursor-pointer transition-colors ${
            theme === 'dark'
              ? 'bg-[rgba(76,126,255,0.15)] text-[#4C7EFF] hover:bg-[rgba(76,126,255,0.25)]'
              : 'bg-[rgba(76,126,255,0.15)] text-[#4C7EFF] hover:bg-[rgba(76,126,255,0.25)]'
          }`}
          onClick={() => {
            connectedDapps.forEach(dapp => handleDisconnect(dapp.id))
          }}
        >
          Disconnect All
        </button>
      </div>
    </div>
  )
}
