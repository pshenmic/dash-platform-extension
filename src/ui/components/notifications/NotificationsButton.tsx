import React, { useState } from 'react'
import { Badge, Button, Popover, Text } from 'dash-ui-kit/react'
import { useNotifications, useOpenContinueOperation, useWalletCapabilities } from '../../hooks'
import { BellIcon } from './BellIcon'
import { NotificationItem } from './NotificationItem'

interface NotificationsButtonProps {
  walletId: string | null
  network: string | null
  // Light header chrome of the dashboards, as on the burger button.
  isLightChrome: boolean
}

// Header bell with the count of notifications and a dropdown list of them.
export function NotificationsButton ({ walletId, network, isLightChrome }: NotificationsButtonProps): React.JSX.Element | null {
  const { hasCoreLayer } = useWalletCapabilities()
  const { notifications, reload } = useNotifications({ enabled: hasCoreLayer, walletId, network })
  const openContinueOperation = useOpenContinueOperation()
  const [isOpen, setIsOpen] = useState(false)

  if (!hasCoreLayer) return null

  const handleOpenChange = (open: boolean): void => {
    setIsOpen(open)
    if (open) reload()
  }

  const continueOperation = (assetLockTxid: string): void => {
    setIsOpen(false)
    openContinueOperation(assetLockTxid)
  }

  const content = (
    <div className='flex flex-col gap-3'>
      <Text size='md' weight='medium'>Notifications</Text>
      {notifications.length === 0
        ? <Text size='sm' dim>No notifications</Text>
        : notifications.map(notification => (
          <NotificationItem key={notification.id} notification={notification} onContinueOperation={continueOperation} />
        ))}
    </div>
  )

  return (
    <Popover content={content} open={isOpen} onOpenChange={handleOpenChange} side='bottom' className='!w-[20rem] max-h-[24rem] overflow-y-auto !rounded-[1rem] !p-4'>
      <Button
        aria-label='Notifications'
        colorScheme={isLightChrome ? 'lightGray' : 'brand'}
        size='xl'
        className='w-12 h-12 p-0 relative z-10'
      >
        <BellIcon
          color={isLightChrome ? undefined : 'white'}
          className={isLightChrome ? '!text-dash-primary-dark-blue' : undefined}
        />
        {notifications.length > 0 && (
          <Badge variant='solid' color='red' size='xxs' className='absolute -top-1 -right-1 min-w-5 h-5 justify-center !py-0 !text-[0.625rem] leading-none'>
            {notifications.length}
          </Badge>
        )}
      </Button>
    </Popover>
  )
}
