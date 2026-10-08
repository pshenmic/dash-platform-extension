import React, { useState } from 'react'
import { Input } from 'dash-ui-kit/react'
import { PercentageSlider } from '../../../../components/controls'
import { formatDashAmount, isDashInputAllowed, multiplyBigIntByPercentage, parseDashAmount, PLATFORM_DASH_DECIMALS } from '../../../../../utils'
import type { AddressData } from '../../../../components/addresses/types'
import type { AddressAmount } from '../../types'
import { CoinRow } from './CoinRow'

interface PlatformInputListProps {
  addresses: AddressData[]
  inputs: AddressAmount[]
  maxInputs: number
  platformFee: bigint
  rate: number | null
  onChange: (inputs: AddressAmount[]) => void
}

const DECIMALS = PLATFORM_DASH_DECIMALS

interface InputAmountProps {
  balance: bigint
  amount: bigint
  onChange: (amount: bigint) => void
}

// Amount taken from one picked address: typed Dash or the slider, capped at the address balance.
function InputAmount ({ balance, amount, onChange }: InputAmountProps): React.JSX.Element {
  const [text, setText] = useState(formatDashAmount(amount, DECIMALS))
  const shown = parseDashAmount(text, DECIMALS) === amount || (text === '' && amount === 0n) ? text : formatDashAmount(amount, DECIMALS)

  const handleText = (value: string): void => {
    if (!isDashInputAllowed(value, DECIMALS)) return
    const parsed = parseDashAmount(value, DECIMALS) ?? 0n
    setText(parsed > balance ? formatDashAmount(balance, DECIMALS) : value)
    onChange(parsed > balance ? balance : parsed)
  }

  return (
    <div className='flex flex-col gap-2'>
      <Input value={shown} onChange={(e) => handleText(e.target.value)} size='sm' className='w-full' />
      <PercentageSlider
        amount={formatDashAmount(amount, DECIMALS)}
        maxBalance={formatDashAmount(balance, DECIMALS)}
        onPercentage={(percentage) => onChange(multiplyBigIntByPercentage(balance, percentage))}
        onClear={() => onChange(0n)}
      />
    </div>
  )
}

// Platform addresses with a check per address and, once picked, the amount taken from it.
export function PlatformInputList ({ addresses, inputs, maxInputs, platformFee, rate, onChange }: PlatformInputListProps): React.JSX.Element {
  const setAmount = (address: string, amountCredits: bigint): void =>
    onChange(inputs.map(input => input.address === address ? { address, amount: amountCredits.toString() } : input))

  const toggle = (item: AddressData): void => {
    if (inputs.some(input => input.address === item.address)) {
      onChange(inputs.filter(input => input.address !== item.address))
      return
    }
    const balance = BigInt(item.balance ?? '0')
    const paysFee = maxInputs === 1 || inputs.length === 0
    const amount = paysFee ? (balance > platformFee ? balance - platformFee : 0n) : balance
    const added = { address: item.address, amount: amount.toString() }
    onChange(maxInputs === 1 ? [added] : [...inputs, added])
  }

  return (
    <div className='flex flex-col gap-2'>
      {addresses.filter(item => item.balance != null && item.balance !== '0').map(item => {
        const balance = BigInt(item.balance ?? '0')
        const input = inputs.find(entry => entry.address === item.address)
        const amount = input != null ? BigInt(input.amount) : 0n

        return (
          <CoinRow
            key={item.address}
            address={item.address}
            amount={balance}
            decimals={DECIMALS}
            rate={rate}
            selected={input != null}
            onToggle={() => toggle(item)}
          >
            {input != null && (
              <InputAmount balance={balance} amount={amount} onChange={(value) => setAmount(item.address, value)} />
            )}
          </CoinRow>
        )
      })}
    </div>
  )
}
