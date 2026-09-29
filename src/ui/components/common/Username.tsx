import React from 'react'
import { Text } from 'dash-ui-kit/react'

const NAME_SUFFIX = '.dash'

interface UsernameProps {
  name: string
  className?: string
}

/** Username that wraps on long names while keeping the ".dash" suffix in one piece. */
export function Username ({ name, className }: UsernameProps): React.JSX.Element {
  const hasSuffix = name.endsWith(NAME_SUFFIX)
  const base = hasSuffix ? name.slice(0, -NAME_SUFFIX.length) : name

  return (
    <Text size='xs' weight='bold' className={`!text-dash-primary-dark-blue/64 break-all min-w-0 ${className ?? ''}`}>
      {base}
      {hasSuffix && (
        <Text as='span' size='xs' weight='bold' className='!text-dash-primary-dark-blue/64 whitespace-nowrap break-normal'>
          {NAME_SUFFIX}
        </Text>
      )}
    </Text>
  )
}
