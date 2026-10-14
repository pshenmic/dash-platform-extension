import React from 'react'
import { Button, Text } from 'dash-ui-kit/react'
import { AmountInputSection } from '../../../components/forms'
import { BalanceCard } from '../../../components/cards'
import { endpointLayer } from '../../../components/controls'
import { dashAmountToUsd, formatDashAmount, multiplyBigIntByPercentage, parseDashAmount } from '../../../../utils'
import { useUsdAmount } from '../hooks/useUsdAmount'
import type { SourceBalance } from '../hooks/useSourceBalance'
import type { TransferDraft } from '../types'

interface AmountStepProps {
  draft: TransferDraft
  balance: SourceBalance
  maxAmount: bigint | null
  amountError: string | null
  // A resumed operation sends its earlier amount, so typing is not capped.
  isPrepaid: boolean
  rate: number | null
  onAmountChange: (amount: string) => void
  onNext: () => void
}

// Step 2 of the send wizard: amount with slider, Max and the source balance.
export function AmountStep ({ draft, balance, maxAmount, amountError, isPrepaid, rate, onAmountChange, onNext }: AmountStepProps): React.JSX.Element {
  const { decimals } = balance
  const isDash = draft.asset.type === 'dash'
  const parsed = parseDashAmount(draft.amount, decimals)

  const { usd, setAmount: handleAmountChange, setUsd: handleUsdChange } = useUsdAmount(draft.amount, decimals, rate, isDash, isPrepaid ? null : maxAmount, onAmountChange)

  return (
    <div className='flex flex-col gap-6'>
      <AmountInputSection
        amount={draft.amount}
        equivalentAmount={usd}
        onAmountChange={handleAmountChange}
        onEquivalentChange={handleUsdChange}
        onQuickAmount={(percentage) => {
          if (maxAmount != null) handleAmountChange(formatDashAmount(multiplyBigIntByPercentage(maxAmount, percentage), decimals))
        }}
        selectedAsset={isDash ? 'credits' : 'token'}
        assetDecimals={decimals}
        maxBalance={maxAmount != null && maxAmount > 0n ? formatDashAmount(maxAmount, decimals) : null}
      />

      {amountError != null && (
        <Text size='sm' className='!text-red-500 -mt-4'>{amountError}</Text>
      )}

      <BalanceCard
        layer={endpointLayer(draft.from.type)}
        amount={balance.amount != null ? formatDashAmount(balance.amount, decimals) : ''}
        unit={balance.unit}
        usd={isDash ? dashAmountToUsd(balance.amount, decimals, rate) : undefined}
        loading={balance.amount == null}
      />

      <Button colorScheme='brand' size='xl' className='w-full' disabled={parsed == null || parsed === 0n || amountError != null} onClick={onNext}>
        Next
      </Button>
    </div>
  )
}
