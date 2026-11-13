import React, { useState } from 'react'
import { PasswordGate } from '../forms'
import { RefreshButton } from '../common'

interface ShieldedSyncStatusProps {
  hasLoaded: boolean
  isSyncing: boolean
  // Shown left of the refresh button, e.g. the shielded balance.
  label?: React.ReactNode
  onSync: (password: string) => Promise<string | null>
}

// Shielded sync progress and a refresh button to look for incoming notes again.
export function ShieldedSyncStatus ({ hasLoaded, isSyncing, label, onSync }: ShieldedSyncStatusProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  const handleSync = async (password: string): Promise<string | null> => {
    const syncError = await onSync(password)
    if (syncError == null) setIsOpen(false)
    return syncError
  }

  if (!hasLoaded && !isSyncing) {
    return (
      <PasswordGate
        description='Enter your password to sync shielded addresses.'
        submitLabel='Sync Shielded Addresses'
        onSubmit={handleSync}
      />
    )
  }

  const row = (
    <div className='flex items-center gap-2'>
      {label}
      <div className='ml-auto shrink-0'>
        <RefreshButton variant='subtle' label='Check for incoming shielded notes' loading={isSyncing} onClick={() => { if (!isSyncing) setIsOpen(open => !open) }} />
      </div>
    </div>
  )

  if (!isOpen || isSyncing) {
    return row
  }

  return (
    <div className='flex flex-col gap-2'>
      {row}
      <PasswordGate
        description='Enter your password to check for incoming shielded notes.'
        submitLabel='Check incoming'
        onSubmit={handleSync}
        onCancel={() => { setIsOpen(false) }}
      />
    </div>
  )
}
