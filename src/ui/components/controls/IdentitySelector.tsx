import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Identifier, OverlayMenu } from 'dash-ui-kit/react'
import type { Identity } from '../../../types'
import { IdentityType } from '../../../types/enums/IdentityType'
import { locationReturnPath, locationReturnState } from '../../types'

interface IdentitySelectorProps {
  identifier: string
  identities: Identity[]
  onSelect: (identifier: string) => void
}

export function IdentitySelector ({ identifier, identities, onSelect }: IdentitySelectorProps): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const from = locationReturnPath(location.state, '/platform')
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
        <Identifier highlight='both' middleEllipsis edgeChars={4} className='!text-sm'>
          {identity.identifier}
        </Identifier>
      </div>
    ),
    onClick: () => {
      onSelect(identity.identifier)
      void navigate(`/identity/${identity.identifier}`, { replace: true, state: locationReturnState(from) })
    }
  }))

  return (
    <OverlayMenu
      overlayLabel='Identity'
      triggerContent={(
        <div className='flex items-center gap-2 min-w-0'>
          <div className='w-6 h-6 rounded-full overflow-hidden shrink-0'>
            <Avatar username={identifier} className='w-6 h-6' />
          </div>
          <Identifier highlight='both' middleEllipsis edgeChars={4} className='!text-sm'>
            {identifier}
          </Identifier>
        </div>
      )}
      items={items}
      size='xl'
      border
      showArrow
      className='!w-auto min-w-[10.5rem] h-12'
    />
  )
}
