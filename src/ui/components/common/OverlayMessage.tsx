import React from 'react'
import { Text, InfoCircleIcon } from 'dash-ui-kit/react'

interface OverlayMessageProps {
  title: string
  message: string
  icon?: React.ReactNode
  iconSize?: number
  iconClassName?: string
}

export const OverlayMessage: React.FC<OverlayMessageProps> = ({
  title,
  message,
  icon,
  iconSize = 16,
  iconClassName = ''
}) => {
  return (
    <div
      className='fixed h-full flex items-center justify-center backdrop-blur-sm bg-white/30 z-10'
      style={{ left: '-20px', right: '-20px', top: '70px', paddingBottom: '70px' }}
    >
      <div className='bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4 border border-gray-200'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <div className='flex gap-2 items-center'>
            {icon ?? <InfoCircleIcon size={iconSize} className={iconClassName} />}
            <Text size='lg' weight='bold'>
              {title}
            </Text>
          </div>
          <Text size='sm' dim>
            {message}
          </Text>
        </div>
      </div>
    </div>
  )
}
