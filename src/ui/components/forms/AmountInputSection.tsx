import React, { useState } from 'react'
import { DashLogo } from 'dash-ui-kit/react'
import { AutoSizingInput, PercentageSlider } from '../controls'
import { clampDashInput, clampToMax, dashAmountToUsd, formatDashAmount, parseDashAmount, parseDecimalInput, usdToDashAmount } from '../../../utils'

interface AmountInputSectionProps {
  amount: string
  // Dash amount already capped at `max`.
  onAmountChange: (value: string) => void
  onQuickAmount: (percentage: number) => void
  selectedAsset: string
  assetDecimals: number
  maxBalance?: string | null
  // USD per Dash; the USD field stays empty without it.
  rate: number | null
  // Input cap in base units, null for no cap.
  max: bigint | null
  // Smaller amount with a Dash icon, for amounts inside a card.
  compact?: boolean
}

export function AmountInputSection ({
  amount,
  onAmountChange,
  onQuickAmount,
  selectedAsset,
  assetDecimals,
  maxBalance,
  rate,
  max,
  compact = false
}: AmountInputSectionProps): React.JSX.Element {
  const isDash = selectedAsset === 'credits'
  // USD text as typed, kept only while the Dash amount is still the one it produced.
  const [typedUsd, setTypedUsd] = useState<{ usd: string, amount: string } | null>(null)

  const usdFor = (value: bigint | null): string =>
    isDash && value != null && rate != null ? (dashAmountToUsd(value, assetDecimals, rate) ?? '').replace('~ $', '') : ''

  const equivalentAmount = typedUsd != null && typedUsd.amount === amount ? typedUsd.usd : usdFor(parseDashAmount(amount, assetDecimals))

  const handleAmountChange = (value: string): void => {
    setTypedUsd(null)
    onAmountChange(clampDashInput(value, assetDecimals, max))
  }

  const handleUsdChange = (value: string): void => {
    const converted = usdToDashAmount(value, rate, assetDecimals)
    const capped = converted != null ? clampToMax(converted, max) : null
    const nextAmount = capped != null ? formatDashAmount(capped, assetDecimals) : ''
    setTypedUsd({ usd: capped !== converted ? usdFor(capped) : value, amount: nextAmount })
    onAmountChange(nextAmount)
  }

  return (
    <div className={`flex flex-col items-center w-full ${compact ? 'gap-3' : 'gap-[1.125rem] py-3'}`}>
      {/* Dual Input Row */}
      <div className='flex items-end justify-center gap-3 w-full max-w-full px-0'>

        {/* Main Amount Input */}
        <AutoSizingInput
          value={amount}
          onChange={handleAmountChange}
          placeholder='0'
          useDefaultStyles={false}
          sizing='fill'
          containerClassName='flex-1 min-w-0'
          className='flex items-center gap-2 px-3 py-1 border-0 border-b border-solid border-[rgba(12,28,51,0.15)] rounded-xl'
          inputClassName={`text-dash-primary-dark-blue font-dash-grotesque font-bold leading-[1.2] placeholder:text-[rgba(12,28,51,0.2)] ${compact ? 'text-[1.25rem] text-center' : 'text-[2rem]'}`}
          onChangeFilter={(value) => {
            const parsed = parseDecimalInput(value, assetDecimals)
            return parsed ?? amount
          }}
          rightContent={compact && (
            <div className='flex items-center justify-center w-4 h-4 shrink-0 rounded-full bg-[rgba(12,28,51,0.05)]'>
              <DashLogo className='w-2.5 h-2.5' color='var(--color-dash-primary-dark-blue)' />
            </div>
          )}
        />

        {/* USD equivalent, only for credits */}
        {isDash && (
          <AutoSizingInput
            value={equivalentAmount}
            onChange={handleUsdChange}
            placeholder='0'
            useDefaultStyles={false}
            sizing='auto'
            containerClassName='flex-shrink-0 max-w-[40%]'
            className='flex items-center gap-2 px-2 pl-2 py-1 border-0 border-b border-solid border-[rgba(12,28,51,0.15)] rounded-xl h-8'
            inputClassName='text-dash-primary-dark-blue opacity-35 font-dash-grotesque font-medium text-[1rem] leading-[1.2] placeholder:text-[rgba(12,28,51,0.2)]'
            minWidth={48}
            onChangeFilter={(value) => {
              const parsed = parseDecimalInput(value, 2)
              return parsed ?? equivalentAmount
            }}
            rightContent={
              <div className='flex items-center justify-center w-4 h-4 shrink-0 rounded-full bg-[rgba(12,28,51,0.05)]'>
                <span className='text-dash-primary-dark-blue text-[0.625rem] font-medium'>$</span>
              </div>
            }
          />
        )}
      </div>

      {/* Percentage Slider */}
      {maxBalance != null && maxBalance !== '' && (
        <PercentageSlider
          amount={amount}
          maxBalance={maxBalance}
          onPercentage={onQuickAmount}
          onClear={() => onAmountChange('')}
          hideZero={compact}
          className='px-1'
        />
      )}
    </div>
  )
}
