import React from 'react'
import { Text, Button } from 'dash-ui-kit/react'
import { useNavigate } from 'react-router-dom'
import { NetworkType, NameStatus } from '../../../types'
import EntityList from '../common/EntityList'
import EntityListItem from '../common/EntityListItem'
import StatusBadge from './StatusBadge'
import SignStatusIcon from './SignStatusIcon'

export interface NameData {
  name: string
  registrationTime: string | null
  status: NameStatus
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
  error
}: NamesListProps): React.JSX.Element {
  const navigate = useNavigate()

  const handleRegisterName = (): void => {
    void navigate('/name-registration')
  }

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

  const formatDate = (timestamp: string | null): string => {
    if (!isValidTimestamp(timestamp)) {
      return 'Unknown date'
    }

    const date = new Date(timestamp as string)
    const day = date.getDate()
    const month = date.toLocaleDateString('en', { month: 'short' })
    const year = date.getFullYear()
    const time = date.toLocaleTimeString('en', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    return `Created: ${day} ${month} ${year}, ${time}`
  }

  return (
    <div className='flex flex-col gap-[10px]'>
      {/* Names List */}
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
          return (
            <EntityListItem key={nameItem.name} className='!cursor-default hover:!bg-[rgba(12,28,51,0.03)]'>
              <div className='flex items-center gap-3'>
                <SignStatusIcon status={nameItem.status} />

                <div className='flex flex-col gap-[2px]'>
                  <Text
                    weight='bold'
                    size='sm'
                    className='leading-[1.366em]'
                  >
                    {(() => {
                      const [base, ...rest] = nameItem.name.split('.')
                      return (rest.length > 0)
                        ? <>{base}<Text weight='normal' color='blue'>.{rest.join('.')}</Text></>
                        : nameItem.name
                    })()}
                  </Text>

                  <Text
                    size='xs'
                    weight='medium'
                    className='leading-[1.366em]'
                    dim
                  >
                    {formatDate(nameItem.registrationTime)}
                  </Text>
                </div>
              </div>

              <StatusBadge status={nameItem.status} />
            </EntityListItem>
          )
        })}
      </EntityList>

      {/* Register Name Button */}
      <div className='px-4'>
        <Button
          variant='outline'
          colorScheme='brand'
          size='md'
          onClick={handleRegisterName}
          className='w-full'
        >
          Register Name
        </Button>
      </div>
    </div>
  )
}

export default NamesList
