import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface EndpointCardProps {
  label: string
  headerAction?: React.ReactNode
  children: React.ReactNode
}

// White section of the From / To card with a label row.
export function EndpointCard ({ label, headerAction, children }: EndpointCardProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3 p-4 rounded-[1.25rem] bg-white dash-shadow-xl dark:bg-gray-900'>
      <div className='flex items-center justify-between gap-2'>
        <Text size='sm' weight='medium' dim>{label}</Text>
        {headerAction}
      </div>
      {children}
    </div>
  )
}
