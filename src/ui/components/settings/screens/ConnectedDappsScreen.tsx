import React from 'react'
import { Text, WebIcon, Button } from 'dash-ui/react'
import type { SettingsScreenProps } from '../types'

export const ConnectedDappsScreen: React.FC<SettingsScreenProps> = () => {
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

  const renderIcon = (): React.JSX.Element => (
    <div className='w-[50px] h-[50px] bg-white rounded-full flex items-center justify-center'>
      <WebIcon />
    </div>
  )

  if (connectedDapps.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[200px] text-center'>
        <Text size='lg' weight='medium' className='text-gray-600'>
          No Connected DApps
        </Text>
        <Text size='sm' className='text-gray-500'>
          When you connect to DApps, they will appear here
        </Text>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4 h-full'>
      <Text
        size='sm'
        dim
        className='opacity-50 text-dash-primary-dark-blue'
      >
        Manage dapps you have connected to.
      </Text>

      <div className='flex flex-col gap-[0.875rem] h-full grow'>
        {connectedDapps.map((dapp) => (
          <div
            key={dapp.id}
            className='rounded-[1rem] px-[1rem] py-[0.625rem] flex items-center justify-between bg-[rgba(12,28,51,0.03)]'
          >
            <div className='flex items-center gap-[1rem] grow-1'>
              {renderIcon()}

              <div className='flex flex-col gap-[0.25rem]'>
                <Text size='md' className='text-dash-primary-dark-blue leading-[1.2]'>
                  {dapp.name}
                </Text>
                {dapp.url !== dapp.name && (
                  <Text
                    dim
                    className='!font-grotesque !text-[0.75rem] leading-[1.2]'
                  >
                    {dapp.url}
                  </Text>
                )}
              </div>
            </div>

            <Button
              size='sm'
              className='h-8 !min-h-auto'
              onClick={() => handleDisconnect(dapp.id)}
            >
              Disconnect
            </Button>
          </div>
        ))}
      </div>

      <div className='mt-6'>
        <button
          className='w-full rounded-[15px] px-[24px] py-[12px] text-base font-medium hover:cursor-pointer transition-colors bg-[rgba(76,126,255,0.15)] text-[#4C7EFF] hover:bg-[rgba(76,126,255,0.25)]'
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
