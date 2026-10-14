import { useState } from 'react'
import { clampDashInput, clampToMax, dashAmountToUsd, formatDashAmount, parseDashAmount, usdToDashAmount } from '../../../../utils'

interface UsdAmount {
  usd: string
  setAmount: (value: string) => void
  setUsd: (value: string) => void
}

// USD field kept in sync with a Dash amount field and capped at `max`; empty when the rate is unknown or the asset is not Dash.
export function useUsdAmount (amount: string, decimals: number, rate: number | null, isDash: boolean, max: bigint | null, onAmountChange: (value: string) => void): UsdAmount {
  const usdFor = (value: bigint | null): string =>
    isDash && value != null && rate != null ? (dashAmountToUsd(value, decimals, rate) ?? '').replace('~ $', '') : ''

  const [usd, setUsdValue] = useState(() => usdFor(parseDashAmount(amount, decimals)))

  const setAmount = (value: string): void => {
    const capped = clampDashInput(value, decimals, max)
    onAmountChange(capped)
    setUsdValue(usdFor(parseDashAmount(capped, decimals)))
  }

  const setUsd = (value: string): void => {
    const converted = usdToDashAmount(value, rate, decimals)
    const capped = converted != null ? clampToMax(converted, max) : null
    setUsdValue(capped !== converted ? usdFor(capped) : value)
    onAmountChange(capped != null ? formatDashAmount(capped, decimals) : '')
  }

  return { usd, setAmount, setUsd }
}
