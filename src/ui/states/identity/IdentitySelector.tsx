import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, ChevronIcon, Identifier, OverlayMenu } from 'dash-ui-kit/react'
import type { Identity } from '../../../types'
import { IdentityType } from '../../../types/enums/IdentityType'

interface IdentitySelectorProps {
  identifier: string
  identities: Identity[]
  onSelect: (identifier: string) => void
}

export function IdentitySelector ({ identifier, identities, onSelect }: IdentitySelectorProps): React.JSX.Element {
  const navigate = useNavigate()
  const rows = identities.length > 0
    ? identities
    : [{ identifier, index: 0, type: IdentityType.regular, proTxHash: null, label: null }]

  const items = rows.map((identity) => ({
    id: identity.identifier,
    content: (
      <div className='flex items-center gap-2 min-w-0'>
        <div className='w-6 h-6 rounded-full overflow-hidden shrink-0'>
          <Avatar username={identity.identifier} className='w-6 h-6' />
        </div>
        <Identifier highlight='both' className='!text-sm !leading-[1.2]'>
          {identity.identifier}
        </Identifier>
      </div>
    ),
    onClick: () => {
      onSelect(identity.identifier)
      void navigate(`/identity/${identity.identifier}`)
    }
  }))

  return (
    <OverlayMenu
      overlayLabel='Your identity'
      triggerContent={(
        <div className='flex items-center gap-2 min-w-0'>
          <div className='w-6 h-6 rounded-full overflow-hidden shrink-0'>
            <Avatar username={identifier} className='w-6 h-6' />
          </div>
          <Identifier highlight='both' className='!text-sm !leading-[1.2]'>
            {identifier}
          </Identifier>
          <ChevronIcon size={12} className='text-dash-primary-dark-blue shrink-0' />
        </div>
      )}
      items={items}
      size='xl'
      border={false}
      showArrow={false}
      className='!h-auto !min-h-0 !bg-transparent !p-0 !w-full max-w-full'
    />
  )
}
