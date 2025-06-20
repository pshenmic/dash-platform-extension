import React from 'react'
import { useAuthCheck } from '../../hooks/useAuthCheck'
import LoadingScreen from '../layout/LoadingScreen'
import Text from '../../text/Text'

export function withAuthCheck<T extends object> (Component: React.ComponentType<T>) {
  return function AuthenticatedComponent (props: T) {
    const { isLoading, isAuthenticated, error } = useAuthCheck()

    if (isLoading) {
      return <LoadingScreen message='Checking authentication...' />
    }

    if (error != null) {
      return (
        <div className='flex flex-col gap-4 items-center justify-center min-h-[200px]'>
          <Text size='lg' color='red'>
            Authentication Error
          </Text>
          <Text size='sm' color='red'>
            {error}
          </Text>
        </div>
      )
    }

    if (!isAuthenticated) {
      return <LoadingScreen message='Redirecting...' />
    }

    return <Component {...props} />
  }
}
