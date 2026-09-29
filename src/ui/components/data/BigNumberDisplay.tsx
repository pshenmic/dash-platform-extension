import React from 'react'
import { BigNumber, Tooltip } from 'dash-ui-kit/react'
import { formatStatNumber } from '../../../utils'

interface BigNumberDisplayProps {
  children: number | string | bigint
  /** Shown after the full number in the tooltip. */
  unit?: string
  className?: string
}

/** Number shortened to fit a narrow space, with the full value in a tooltip when it was cut. */
function BigNumberDisplay ({ children, unit, className = '' }: BigNumberDisplayProps): React.JSX.Element {
  const full = String(children)
  const short = formatStatNumber(full)

  if (short === full) {
    return <span className={className}>{full}</span>
  }

  return (
    <Tooltip
      content={(
        <span className='inline-flex items-baseline gap-1 whitespace-nowrap text-dash-primary-dark-blue'>
          <span className='text-[0.875rem] font-medium'>
            <BigNumber>{full}</BigNumber>
          </span>
          {unit != null && (
            <span className='text-[0.625rem] font-medium text-dash-primary-dark-blue/64'>{unit}</span>
          )}
        </span>
      )}
    >
      <span className={`cursor-help ${className}`}>{short}</span>
    </Tooltip>
  )
}

export default BigNumberDisplay
