import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen ({ message = 'Loading...' }: LoadingScreenProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-4 items-center justify-center min-h-[200px]'>
      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600' />
      <Text color='blue' size='lg'>
        {message}
      </Text>
    </div>
  )
}
