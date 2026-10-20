import React from 'react'
import { AssetBalanceLabel } from '../../../../components/data'
import { dashAmountToUsd, formatDashAmount } from '../../../../../utils'
import type { SourceBalance } from '../../hooks/useSourceBalance'

interface SourceBalanceLabelProps {
  balance: SourceBalance
  rate: number | null
}

// Source balance with its USD value for Dash; nothing until the balance is known.
export function SourceBalanceLabel ({ balance, rate }: SourceBalanceLabelProps): React.JSX.Element | null {
  if (balance.amount == null) return null

  return (
    <AssetBalanceLabel
      balance={formatDashAmount(balance.amount, balance.decimals)}
      unit={balance.unit}
      usdValue={balance.unit === 'Dash' ? dashAmountToUsd(balance.amount, balance.decimals, rate) : null}
    />
  )
}
