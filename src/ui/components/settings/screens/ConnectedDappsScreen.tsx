import React from 'react'
import { Text, useTheme, WebIcon } from 'dash-ui/react'
import type { SettingsScreenProps } from '../types'

export const ConnectedDappsScreen: React.FC<SettingsScreenProps> = () => {
  const { theme } = useTheme()
  const connectedDapps = [
    {
      id: 'dashcentral',
      name: 'dashcentral.org',
      url: 'dashcentral.org'
    },
    {
      id: 'platform-explorer',
      name: 'Platform Explorer',
      url: 'platform-explorer.com'
    },
    {
      id: 'dash-org',
      name: 'dash.org',
      url: 'dash.org'
    }
  ]

  const handleDisconnect = (dappId: string): void => {
    console.log(`Disconnect dapp: ${dappId}`)
    // TODO: Implement disconnect logic
  }

  const renderIcon = (): React.JSX.Element => {
    const iconBgClass = theme === 'dark' ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-white'

    return (
      <div className={`w-[50px] h-[50px] ${iconBgClass} rounded-full flex items-center justify-center`}>
        <WebIcon theme={theme} />
      </div>
    )
  }

  if (connectedDapps.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[200px] text-center'>
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
      <Text
        size='sm' weight='500' className={`mb-6 opacity-50 ${
        theme === 'dark' ? 'text-white' : 'text-[#0C1C33]'
      }`}
      >
        Manage dapps you have connected to.
      </Text>

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
              {renderIcon()}

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
