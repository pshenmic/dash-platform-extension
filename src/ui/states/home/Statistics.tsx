import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface StatisticsProps {
  /** Rendered under the section title. */
  lastTransaction: React.ReactNode
}

export function Statistics ({ lastTransaction }: StatisticsProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3'>
      <Text size='lg' weight='medium' className='!text-dash-primary-dark-blue/48 !tracking-[-0.03em]'>
        General Statistics
      </Text>
      {lastTransaction}
    </div>
  )
}
