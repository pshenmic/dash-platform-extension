import React, { useMemo, useState } from 'react'
import { Avatar } from 'dash-ui-kit/react'
import type { Identity } from '../../../types'
import type { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'
import { SelectIdentityDialog } from '../Identities'

interface ActiveIdentitySelectorProps {
  currentIdentity: string
  identities: Identity[]
  currentWallet?: WalletAccountInfo | null
  onSelect: (identifier: string) => void
}

// Square header button with the active identity avatar that opens the identity picker.
export function ActiveIdentitySelector ({ currentIdentity, identities, currentWallet, onSelect }: ActiveIdentitySelectorProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const identifiers = useMemo(() => identities.map(identity => identity.identifier), [identities])

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='w-12 h-12 shrink-0 flex items-center justify-center cursor-pointer rounded-[0.875rem] bg-white outline outline-1 outline-offset-[-1px] outline-[rgba(12,28,51,0.35)] focus:outline-[rgba(12,28,51,0.6)] transition-all'
      >
        <div className='w-6 h-6 rounded-full overflow-hidden'>
          <Avatar username={currentIdentity} className='w-6 h-6' />
        </div>
      </button>

      <SelectIdentityDialog
        open={open}
        onOpenChange={setOpen}
        identities={identifiers}
        currentIdentity={currentIdentity}
        onSelectIdentity={onSelect}
        currentWallet={currentWallet}
      />
    </>
  )
}
