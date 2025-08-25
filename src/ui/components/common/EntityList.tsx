import React from 'react'
import { Text } from 'dash-ui/react'

interface EntityListProps {
  children: React.ReactNode
  loading: boolean
  error: string | null
  isEmpty: boolean
  variant?: 'tight' | 'spaced'
  loadingText?: string
  errorText?: string
  emptyText?: string
}

function EntityList ({
  children,
  loading,
  error,
  isEmpty,
  variant = 'tight',
  loadingText = 'Loading...',
  errorText,
  emptyText = 'No items found'
}: EntityListProps): React.JSX.Element {
  const containerClass = `entities-list-container ${
    variant === 'tight' ? 'entities-list-container-tight' : 'entities-list-container-spaced'
  }`

  return (
    <div className={containerClass}>
      {loading && (
        <div className='entities-list-state-message'>
          <Text className='entities-list-loading'>{loadingText}</Text>
        </div>
      )}

      {error && (
        <div className='entities-list-state-message'>
          <Text className='entities-list-error'>
            {errorText || `Error: ${error}`}
          </Text>
        </div>
      )}

      {!loading && !error && isEmpty && (
        <div className='entities-list-state-message'>
          <Text className='entities-list-empty'>{emptyText}</Text>
        </div>
      )}

      {!loading && !error && !isEmpty && children}
    </div>
  )
}

export default EntityList
