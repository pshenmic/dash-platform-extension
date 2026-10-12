import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface FiatChipProps {
  /** Null when the fiat value is unknown, rendered as a dash instead of a number. */
  label: string | null
  hide: boolean
  className?: string
  textClassName?: string
}

export function FiatChip ({ label, hide, className, textClassName }: FiatChipProps): React.JSX.Element {
  return (
    <div className={`flex shrink-0 rounded-full backdrop-blur-[4px] ${className ?? ''}`}>
      <Text size='xs' weight='medium' className={`whitespace-nowrap ${textClassName ?? ''}`}>
        {hide ? '~ ••• USD' : (label ?? '-')}
      </Text>
    </div>
  )
}
