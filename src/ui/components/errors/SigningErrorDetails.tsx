import React from 'react'
import { Text, ValueCard, Identifier } from 'dash-ui-kit/react'
import { FieldLabel } from '../typography'

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
          <Text size='sm'>{message}</Text>
        </ValueCard>
      </div>
      {hex != null && (
        <div className='flex flex-col gap-2'>
          <FieldLabel>Transaction Hex</FieldLabel>
          <ValueCard colorScheme='lightGray' size='xl' border={false} className='flex flex-col gap-2'>
            <Identifier copyButton linesAdjustment={false}>
              {hex}
            </Identifier>
          </ValueCard>
        </div>
      )}
    </>
  )
}
