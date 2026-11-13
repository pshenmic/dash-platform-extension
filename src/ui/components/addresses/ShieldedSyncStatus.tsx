import React, { useState } from 'react'
import { Text } from 'dash-ui-kit/react'
import { PasswordGate } from '../forms'

interface ShieldedSyncStatusProps {
  hasLoaded: boolean
  isSyncing: boolean
  // When false the check button is hidden, as there is nothing new to find.
  hasUpdates?: boolean
  // Shown left of the check button, e.g. the shielded balance.
  label?: React.ReactNode
  onSync: (password: string) => Promise<string | null>
}

// Shielded sync progress and a button to look for incoming notes again.
export function ShieldedSyncStatus ({ hasLoaded, isSyncing, hasUpdates = true, label, onSync }: ShieldedSyncStatusProps): React.JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false)

  const handleSync = async (password: string): Promise<string | null> => {
    const syncError = await onSync(password)
    if (syncError == null) setIsOpen(false)
    return syncError
  }

  if (isSyncing) {
    return (
      <div className='flex flex-col gap-2'>
        {label}
        <Text size='sm' dim>Syncing shielded notes...</Text>
      </div>
    )
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
      <div className='flex flex-col gap-2'>
        {label}
        <PasswordGate
          description='Enter your password to check for incoming shielded notes.'
          submitLabel='Check incoming'
          onSubmit={handleSync}
          onCancel={() => { setIsOpen(false) }}
        />
      </div>
    )
  }

  if (!hasUpdates) {
    return label != null ? <>{label}</> : null
  }

  return (
    <div className='flex items-center gap-2'>
      {label}
      <button
        type='button'
        className='ml-auto shrink-0 border-0 bg-transparent p-0 cursor-pointer'
        onClick={() => { setIsOpen(true) }}
      >
        <Text size='sm' weight='medium' className='!text-dash-brand'>Check now</Text>
      </button>
    </div>
  )
}
