import React from 'react'
import { Text, TransactionStatusIcon, DateBlock } from 'dash-ui-kit/react'
import { NetworkType } from '../../../types'
import EntityList from '../common/EntityList'
import EntityListItem from '../common/EntityListItem'

export interface NameData {
  name: string
  registrationTime: string | null
  state: 'pending' | 'active' | 'locked'
}

interface NamesListProps {
  names: NameData[]
  loading: boolean
  error: string | null
  currentNetwork: NetworkType
}

function NamesList ({
  names,
  loading,
  error,
  currentNetwork
}: NamesListProps): React.JSX.Element {
  const isValidTimestamp = (timestamp: string | null): boolean => {
    if (timestamp === null || timestamp === '') {
      return false
    }
    
    try {
      const date = new Date(timestamp)
      return !isNaN(date.getTime())
    } catch {
      return false
    }
  }

  const getStateIcon = (state: string): 'success' | 'error' | 'pending' => {
    switch (state) {
      case 'active':
        return 'success'
      case 'locked':
        return 'error'
      case 'pending':
      default:
        return 'pending'
    }
  }

  const getStateColor = (state: string): string => {
    switch (state) {
      case 'active':
        return 'text-green-600'
      case 'locked':
        return 'text-red-600'
      case 'pending':
      default:
        return 'text-yellow-600'
    }
  }

  return (
    <EntityList
      loading={loading}
      error={error}
      isEmpty={(names == null) || names.length === 0}
      variant='tight'
      loadingText='Loading names...'
      errorText={(error != null && error !== '') ? `Error loading names: ${error}` : undefined}
      emptyText='No names found'
    >
      {names.map((nameItem) => {
        const hasValidTimestamp = isValidTimestamp(nameItem.registrationTime)
        const stateIcon = getStateIcon(nameItem.state)
        const stateColor = getStateColor(nameItem.state)

        return (
          <EntityListItem key={nameItem.name}>
            <div className='flex items-center gap-3'>
              <TransactionStatusIcon 
                className='w-6 h-6 opacity-80' 
                status={stateIcon} 
              />

              <div className='flex flex-col gap-1'>
                <div className='flex items-center gap-2'>
                  <Text
                    weight='medium'
                    size='sm'
                    className='text-dash-primary-dark-blue'
                  >
                    {nameItem.name}
                  </Text>
                </div>
                
                <div className='flex items-center gap-2'>
                  <Text size='xs' className='text-gray-500'>
                    Registered:
                  </Text>
                  {hasValidTimestamp ? (
                    <DateBlock
                      timestamp={nameItem.registrationTime!}
                      format='dateOnly'
                      showTime={false}
                      className='text-xs text-gray-600'
                    />
                  ) : (
                    <Text size='xs' className='text-gray-600'>
                      Unknown
                    </Text>
                  )}
                </div>
              </div>
            </div>

            <div className='flex flex-col items-end gap-1'>
              <Text
                size='sm'
                weight='medium'
                className={`capitalize ${stateColor}`}
              >
                {nameItem.state}
              </Text>
            </div>
          </EntityListItem>
        )
      })}
    </EntityList>
  )
}

export default NamesList
