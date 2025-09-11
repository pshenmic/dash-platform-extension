import React from 'react'
import { Text, WebIcon, Button } from 'dash-ui-kit/react'
import type { AppConnect } from '../../../types'

interface ConnectedDappItemProps {
  dapp: AppConnect
  isDisconnecting: boolean
  onDisconnect: (dappId: string) => void
}

export const ConnectedDappItem: React.FC<ConnectedDappItemProps> = ({
  dapp,
  isDisconnecting,
  onDisconnect
}) => {
  return (
    <div className='rounded-[1rem] px-[1rem] py-[0.625rem] flex items-center justify-between bg-dash-primary-dark-blue/[0.03]'>
      <div className='flex items-center gap-[1rem] grow-1'>
        <div className='w-[50px] h-[50px] bg-white rounded-full flex items-center justify-center'>
          <WebIcon />
        </div>

        <div className='flex flex-col gap-[0.25rem]'>
          <Text size='md' className='text-dash-primary-dark-blue leading-[1.2]'>
            {new URL(dapp.url).hostname}
          </Text>
        </div>
      </div>

      <Button
        size='sm'
        className='h-8 !min-h-auto'
        onClick={() => onDisconnect(dapp.id)}
        disabled={isDisconnecting}
      >
        {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
      </Button>
    </div>
  )
}
