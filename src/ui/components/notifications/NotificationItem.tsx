import React from 'react'
import { Button } from 'dash-ui-kit/react'
import { UnfinishedOperationSummary } from '../transfer'
import type { AppNotification } from '../../types'

interface NotificationItemProps {
  notification: AppNotification
  onContinueOperation: (assetLockTxid: string) => void
}

// One row of the notifications list, rendered by its type.
export function NotificationItem ({ notification, onContinueOperation }: NotificationItemProps): React.JSX.Element {
  return (
    <div className='flex items-center gap-3 w-full'>
      <UnfinishedOperationSummary operation={notification.operation} />
      <Button colorScheme='lightBlue' size='sm' className='shrink-0' onClick={() => onContinueOperation(notification.operation.assetLockTxid)}>Continue</Button>
    </div>
  )
}
