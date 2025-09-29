import React from 'react'
import { Text, CheckmarkIcon, LockIcon, PendingIcon } from 'dash-ui-kit/react'
import { NameStatus } from '../../../types'
import { nameStatusStyles } from './nameStatusStyles'

interface StatusBadgeProps {
  status: NameStatus
}

const StatusBadge = ({ status }: StatusBadgeProps): React.JSX.Element => {
  const styles = nameStatusStyles[status]
  const iconClasses = `w-2 h-2 ${styles.iconColor}`

  const StatusIcon = {
    locked: <LockIcon className={iconClasses} />,
    pending: <PendingIcon className={iconClasses} />,
    ok: <CheckmarkIcon className={iconClasses} />
  }

  return (
    <div className={`flex items-center gap-2 px-[0.3125rem] py-[0.1875rem] pl-[0.1875rem] rounded-[1.5rem] ${styles.statusBg}`}>
      <div className={` flex items-center justify-center w-[0.875rem] h-[0.875rem] rounded-full ${styles.statusBg}`}>
        {StatusIcon[status]}
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
