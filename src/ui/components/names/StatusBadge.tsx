import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface StatusBadgeProps {
  state: 'pending' | 'active' | 'locked'
  showIcon?: boolean
}

const getStateStyles = (state: string): {
  iconBg: string
  iconColor: string
  statusBg: string
  statusText: string
  statusLabel: string
} => {
  switch (state) {
    case 'active':
      return {
        iconBg: 'bg-[rgba(76,126,255,0.05)]',
        iconColor: 'stroke-[#4C7EFF]',
        statusBg: 'bg-[rgba(76,126,255,0.15)]',
        statusText: 'text-[#4C7EFF]',
        statusLabel: 'Finished'
      }
    case 'locked':
      return {
        iconBg: 'bg-[rgba(233,54,54,0.05)]',
        iconColor: 'stroke-[#E93636]',
        statusBg: 'bg-[rgba(233,54,54,0.15)]',
        statusText: 'text-[#E93636]',
        statusLabel: 'Locked'
      }
    case 'pending':
    default:
      return {
        iconBg: 'bg-[rgba(255,193,7,0.05)]',
        iconColor: 'stroke-[#FFC107]',
        statusBg: 'bg-[rgba(255,193,7,0.15)]',
        statusText: 'text-[#FFC107]',
        statusLabel: 'Pending'
      }
  }
}

export const NameIcon = ({ state }: { state: string }): React.JSX.Element => {
  const styles = getStateStyles(state)

  if (state === 'locked') {
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${styles.iconBg}`}>
        <svg width='16' height='12' viewBox='0 0 16 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
          <path d='M4 2.5V8H6V2.5C6 1.5 7 0.5 8 0.5C9 0.5 10 1.5 10 2.5V8H12V2.5C12 0.5 10.5 -1 8 -1C5.5 -1 4 0.5 4 2.5Z' className={styles.iconColor} strokeWidth='1' fill='none' />
        </svg>
      </div>
    )
  }

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${styles.iconBg}`}>
      <svg width='16' height='12' viewBox='0 0 16 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M1 6L6 11L15 1' className={styles.iconColor} strokeWidth='1' fill='none' />
      </svg>
    </div>
  )
}

const StatusBadge = ({ state, showIcon = false }: StatusBadgeProps): React.JSX.Element => {
  const styles = getStateStyles(state)

  if (showIcon) {
    return <NameIcon state={state} />
  }

  return (
    <div className={`flex items-center gap-2 px-[5px] py-[3px] pl-[3px] rounded-[24px] ${styles.statusBg}`}>
      <div className='w-[14px] h-[14px] relative'>
        <div className={`w-[14px] h-[14px] rounded-full ${styles.statusBg}`} />
        {state === 'locked'
          ? (
            <svg
              width='6'
              height='8'
              viewBox='0 0 6 8'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              className='absolute top-[2.5px] left-[4px]'
            >
              <path d='M1 2V6H5V2H1ZM2 1C2 0.5 2.5 0 3 0C3.5 0 4 0.5 4 1V2H2V1Z' className={styles.iconColor} strokeWidth='1' />
            </svg>
            )
          : (
            <svg
              width='5.95'
              height='3.85'
              viewBox='0 0 6 4'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              className='absolute top-[4.9px] left-[4.2px]'
            >
              <path d='M0.5 2L2.5 3.5L5.5 0.5' className={styles.iconColor} strokeWidth='1' fill='none' />
            </svg>
            )}
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
