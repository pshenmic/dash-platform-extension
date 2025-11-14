import React from 'react'
import { Text, ValueCard } from 'dash-ui-kit/react'
import { getPurposeLabel, getSecurityLabel } from '../../../enums'
import type { KeyRequirement } from './PublicKeySelect'

interface MissingRequiredKeyWarningProps {
  keyRequirements: KeyRequirement[]
  colorScheme?: 'lightGray' | 'yellow'
  description?: string
  className?: string
}

export function MissingRequiredKeyWarning ({
  keyRequirements,
  colorScheme = 'lightGray',
  description,
  className = ''
}: MissingRequiredKeyWarningProps): React.JSX.Element {
  return (
    <ValueCard
      colorScheme={colorScheme}
      size='xl'
      border={false}
      className={`flex flex-col gap-3 items-start ${className}`}
    >
      <Text size='sm'>
        Missing Required Key:
      </Text>
      <div className='flex flex-col gap-2'>
        {keyRequirements.map((req, index) => (
          <div key={index} className='flex gap-2'>
            <ValueCard colorScheme='white' size='sm' className='px-2 py-1'>
              <Text size='sm' weight='medium'>
                {getPurposeLabel(req.purpose)}
              </Text>
            </ValueCard>
            <ValueCard colorScheme='white' size='sm' className='px-2 py-1'>
              <Text size='sm' weight='medium'>
                {getSecurityLabel(req.securityLevel)}
              </Text>
            </ValueCard>
          </div>
        ))}
      </div>
      {description != null && (
        <Text size='sm' dim>
          {description}
        </Text>
      )}
    </ValueCard>
  )
}
