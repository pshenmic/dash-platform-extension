import React from 'react'
import { Text, ValueCard } from 'dash-ui-kit/react'
import { FieldLabel } from '../typography'
import { CopyButton } from 'dash-ui-kit/react'

export interface SigningErrorDetailsProps {
  name: string
  message: string
  hex: string | null
}

export function SigningErrorDetails ({ name, message, hex }: SigningErrorDetailsProps): React.ReactElement {
  return (
    <>
      <div className='flex flex-col gap-2'>
        <FieldLabel>{name}</FieldLabel>
        <ValueCard colorScheme='yellow' size='xl' border={false} className='flex flex-col gap-2'>
          <Text size='sm' className='whitespace-pre-wrap break-words max-w-full'>{message}</Text>
        </ValueCard>
      </div>
      {hex != null && (
        <div className='flex flex-col gap-2'>
          <ValueCard colorScheme='lightGray' size='xl' border={false} className='flex gap-2 justify-center'>
            <Text size='sm' className='whitespace-pre-wrap break-words'>Copy Transaction Hex</Text>
            <CopyButton text={hex} />
          </ValueCard>
        </div>
      )}
    </>
  )
}
