import React, { useState } from 'react'
import { Button, Text, WebIcon } from 'dash-ui-kit/react'
import { IdentityAccessChip, IdentityChecklist } from '../identity'
import { getFaviconUrl } from '../../../utils'
import type { AppConnect } from '../../../types'

interface ConnectedWebsiteItemProps {
  website: AppConnect
  // Identities of the current wallet; the website can only be given these.
  walletIdentities: string[]
  isDisconnecting: boolean
  isSaving: boolean
  onDisconnect: (websiteId: string) => void
  onIdentitiesChange: (websiteId: string, identities: string[]) => void
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** Connected website card: favicon, host, disconnect button and the identities it can see. */
export const ConnectedWebsiteItem: React.FC<ConnectedWebsiteItemProps> = ({
  website,
  walletIdentities,
  isDisconnecting,
  isSaving,
  onDisconnect,
  onIdentitiesChange
}) => {
  const [open, setOpen] = useState(false)
  const [faviconFailed, setFaviconFailed] = useState(false)

  const selected = walletIdentities.filter(identifier => website.identities.includes(identifier))
  const allSelected = walletIdentities.length > 0 && selected.length === walletIdentities.length
  const busy = isSaving || isDisconnecting

  const toggle = (identifier: string): void => {
    onIdentitiesChange(website.id, selected.includes(identifier)
      ? selected.filter(id => id !== identifier)
      : [...selected, identifier])
  }

  const toggleAll = (): void => onIdentitiesChange(website.id, allSelected ? [] : walletIdentities)

  return (
    <div className='flex flex-col gap-3 p-4 rounded-3xl bg-dash-primary-dark-blue/[0.03]'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3 min-w-0'>
          <div className='flex items-center justify-center size-10 shrink-0 rounded-full bg-white'>
            {faviconFailed
              ? <WebIcon />
              : <img src={getFaviconUrl(website.url, 32)} alt='' className='size-5 rounded-sm' onError={() => setFaviconFailed(true)} />}
          </div>
          <Text size='sm' weight='medium' className='truncate'>{hostOf(website.url)}</Text>
        </div>

        <Button
          size='sm'
          colorScheme='lightBlue'
          className='h-8 !min-h-auto shrink-0'
          onClick={() => onDisconnect(website.id)}
          disabled={isDisconnecting}
        >
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </Button>
      </div>

      {walletIdentities.length > 0
        ? (
          <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-1.5 min-w-0'>
              <Text size='xs' weight='medium' dim className='shrink-0'>Can see</Text>
              <IdentityAccessChip
                selected={selected}
                total={walletIdentities.length}
                allSelected={allSelected}
                open={open}
                onClick={() => setOpen(prev => !prev)}
                disabled={isDisconnecting}
              />
            </div>
            {open && (
              <IdentityChecklist
                identities={walletIdentities}
                selected={selected}
                allSelected={allSelected}
                onToggle={toggle}
                onToggleAll={toggleAll}
                disabled={busy}
              />
            )}
          </div>
          )
        : <Text size='xs' weight='medium' dim>This wallet has no identities yet</Text>}
    </div>
  )
}
