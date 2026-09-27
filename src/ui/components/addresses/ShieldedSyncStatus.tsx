import React, { useState } from 'react'
import { Text } from 'dash-ui-kit/react'
import { PasswordGate } from '../forms'

interface ShieldedSyncStatusProps {
  hasLoaded: boolean
  updatedAt: number | null
  isSyncing: boolean
  onSync: (password: string) => Promise<string | null>
}

const formatCheckedAt = (timestamp: number): string => {
  const date = new Date(timestamp)
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return date.toDateString() === new Date().toDateString()
    ? time
    : `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`
}

// Shows when incoming shielded notes were last looked for and lets the user look again.
export function ShieldedSyncStatus ({ hasLoaded, updatedAt, isSyncing, onSync }: ShieldedSyncStatusProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  const handleSync = async (password: string): Promise<string | null> => {
    const syncError = await onSync(password)
    if (syncError == null) setIsOpen(false)
    return syncError
  }

  if (isSyncing) {
    return <Text size='sm' dim>Syncing shielded notes...</Text>
  }

  if (!hasLoaded) {
    return (
      <PasswordGate
        description='Enter your password to sync shielded addresses.'
        submitLabel='Sync Shielded Addresses'
        onSubmit={handleSync}
      />
    )
  }

  if (isOpen) {
    return (
      <PasswordGate
        description='Enter your password to check for incoming shielded notes.'
        submitLabel='Check incoming'
        onSubmit={handleSync}
        onCancel={() => { setIsOpen(false) }}
      />
    )
  }

  return (
    <div className='flex items-center justify-between gap-2'>
      <Text size='xs' dim>
        Incoming checked {updatedAt != null ? formatCheckedAt(updatedAt) : '-'}
      </Text>
      <button
        type='button'
        className='border-0 bg-transparent p-0 cursor-pointer'
        onClick={() => { setIsOpen(true) }}
      >
        <Text size='xs' weight='medium' className='!text-dash-brand'>Check now</Text>
      </button>
    </div>
  )
}
