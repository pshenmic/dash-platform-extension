import React from 'react'
import { SignIcon, SignLockIcon } from 'dash-ui-kit/react'
import { NameStatus } from '../../../types'
import { nameStatusStyles } from './nameStatusStyles'

export const SignStatusIcon = ({ status }: { status: NameStatus }): React.JSX.Element => {
  const styles = nameStatusStyles[status]

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${styles.iconBg}`}>
      {status === 'locked'
        ? <SignLockIcon />
        : <SignIcon className={styles.statusText} />}
    </div>
  )
}

export default SignStatusIcon
