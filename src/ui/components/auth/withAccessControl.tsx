import React from 'react'
import { useAccessControl, type AccessControlConfig } from '../../hooks/useAccessControl'
import LoadingScreen from '../layout/LoadingScreen'
import { Text } from 'dash-ui/react'

export function withAccessControl<T extends object> (
  Component: React.ComponentType<T>,
  config?: AccessControlConfig
) {
  return function AccessControlledComponent (props: T) {
    const { isLoading, isAuthenticated, error } = useAccessControl(config)

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
