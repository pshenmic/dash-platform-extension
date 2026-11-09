import React from 'react'
import { Identifier } from 'dash-ui-kit/react'

/** Full identity identifier with avatar, wrapped onto balanced lines instead of cut in the middle. */
export function IdentityValue ({ identifier }: { identifier: string }): React.JSX.Element {
  return (
    <Identifier size='xs' avatar highlight='both' className='min-w-0 text-left'>{identifier}</Identifier>
  )
}
