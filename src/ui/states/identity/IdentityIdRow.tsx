import React from 'react'
import { Avatar, CopyButton, ExternalLinkIcon, Identifier } from 'dash-ui-kit/react'
import type { NetworkType } from '../../../types'
import { getIdentityExplorerUrl } from '../../../utils'
import { IconChip } from '../../components/common/IconChip'

interface IdentityIdRowProps {
  identifier: string
  network: NetworkType
}

export function IdentityIdRow ({ identifier, network }: IdentityIdRowProps): React.JSX.Element {
  return (
    <div className='flex items-start gap-2'>
      <div className='w-6 h-6 rounded-full overflow-hidden shrink-0'>
        <Avatar username={identifier} className='w-6 h-6' />
      </div>
      <Identifier highlight='both' className='!text-sm !leading-[1.2] flex-1'>
        {identifier}
      </Identifier>
      <IconChip label='View in explorer' href={getIdentityExplorerUrl(identifier, network)}>
        <ExternalLinkIcon size={14} color='#000000' />
      </IconChip>
      <IconChip label='Copy identifier'>
        <CopyButton
          text={identifier}
          aria-label='Copy identifier'
          className='!p-0 !bg-transparent [&_svg]:!size-3.5'
        />
      </IconChip>
    </div>
  )
}
