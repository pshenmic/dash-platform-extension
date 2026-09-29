import React from 'react'
import { Text } from 'dash-ui-kit/react'
import ScreenLoader from '../layout/screens/ScreenLoader'

interface EntityListProps {
  children: React.ReactNode
  loading: boolean
  error: string | null
  isEmpty: boolean
  variant?: 'tight' | 'spaced'
  errorText?: string
  emptyText?: string
}

function EntityList ({
  children,
  loading,
  error,
  isEmpty,
  variant = 'tight',
  errorText,
  emptyText = 'No items found'
}: EntityListProps): React.JSX.Element {
  const containerClass = `entities-list-container ${
    variant === 'tight' ? 'entities-list-container-tight' : 'entities-list-container-spaced'
  }`

  return (
    <div className={containerClass}>
      {loading && <ScreenLoader className='min-h-[120px]' />}

      {error !== null && (
        <div className='entities-list-state-message'>
          <Text className='entities-list-error'>
            {errorText ?? `Error: ${error}`}
          </Text>
        </div>
      )}

      {!loading && error === null && isEmpty && (
        <div className='entities-list-state-message'>
          <Text className='entities-list-empty'>{emptyText}</Text>
        </div>
      )}

      {!loading && error === null && !isEmpty && children}
    </div>
  )
}

export default EntityList
