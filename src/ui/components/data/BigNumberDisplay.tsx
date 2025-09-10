import React from 'react'
import { BigNumber, Text } from 'dash-ui-kit/react'
import { isTooBigNumber, numberDigitRound } from '../../../utils'

interface BigNumberDisplayProps {
  children: number | string | bigint
  className?: string
}

function BigNumberDisplay ({ children, className = '' }: BigNumberDisplayProps): React.JSX.Element {
  const number = children

  return isTooBigNumber(number)
    ? <Text monospace className={className ?? ''}>{numberDigitRound(number)}</Text>
    : <BigNumber className={className ?? ''}>{Number(number)}</BigNumber>
}

export default BigNumberDisplay
