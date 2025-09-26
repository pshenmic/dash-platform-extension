import React from 'react'
import { Text, CheckmarkIcon, LockIcon, PendingIcon } from 'dash-ui-kit/react'
import { NameStatus } from '../../../types'
import { nameStatusStyles } from './nameStatusStyles'

interface StatusBadgeProps {
  status: NameStatus
}

const StatusBadge = ({ status }: StatusBadgeProps): React.JSX.Element => {
  const styles = nameStatusStyles[status]

  return (
    <div className={`flex items-center gap-2 px-[5px] py-[3px] pl-[3px] rounded-[24px] ${styles.statusBg}`}>
      <div className={` flex items-center justify-center w-[14px] h-[14px] rounded-full ${styles.statusBg}`}>
        {status === 'locked'
          ? <LockIcon className={`w-2 h-2 ${styles.iconColor}`} />
          : status === 'pending'
            ? <PendingIcon className={`w-2 h-2 ${styles.iconColor}`} />
            : <CheckmarkIcon className={`w-2 h-2 ${styles.iconColor}`} />}
      </div>
      <Text
        size='xs'
        weight='medium'
        className={styles.statusText}
      >
        {styles.statusLabel}
      </Text>
    </div>
  )
}

export default StatusBadge
