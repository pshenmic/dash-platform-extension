import React from 'react'
import { BigNumber, Text } from 'dash-ui-kit/react'
import { isTooBigNumber, formatBigNumber } from '../../../utils'

interface BigNumberDisplayProps {
  children: number | string | bigint
  className?: string
}

function BigNumberDisplay ({ children, className = '' }: BigNumberDisplayProps): React.JSX.Element {
  const number = children

  return isTooBigNumber(number)
    ? <Text monospace className={className ?? ''}>{formatBigNumber(String(number))}</Text>
    : <BigNumber className={className ?? ''}>{Number(number)}</BigNumber>
}

export default BigNumberDisplay
