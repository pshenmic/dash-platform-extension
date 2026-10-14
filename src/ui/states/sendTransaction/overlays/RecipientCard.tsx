import React, { useState } from 'react'
import { Identifier, SearchIcon, Text } from 'dash-ui-kit/react'
import { AmountInputSection } from '../../../components/forms'
import { RecipientSearchInput } from '../../../components/Identities'
import { formatDashAmount, multiplyBigIntByPercentage } from '../../../../utils'
import type { RecipientSearchResult } from '../../../../utils'
import type { NetworkType } from '../../../../types'
import { RECIPIENT_PLACEHOLDERS } from '../constants'
import { useUsdAmount } from '../hooks/useUsdAmount'
import type { TransferRecipient } from '../types'

interface RecipientCardProps {
  index: number
  recipient: TransferRecipient
  isCore: boolean
  decimals: number
  maxAmount: bigint | null
  rate: number | null
  error: string | null
  canRemove: boolean
  excludeIdentifier: string | null
  network: NetworkType
  onChange: (recipient: TransferRecipient) => void
  onRemove: () => void
}

// One Advanced recipient: address, amount with USD and a slider up to what the others leave.
export function RecipientCard ({ index, recipient, isCore, decimals, maxAmount, rate, error, canRemove, excludeIdentifier, network, onChange, onRemove }: RecipientCardProps): React.JSX.Element {
  const [text, setText] = useState(recipient.address)
  const [isEditing, setIsEditing] = useState(recipient.address === '')
  const [typeError, setTypeError] = useState(false)
  const { usd, setAmount, setUsd } = useUsdAmount(recipient.amount, decimals, rate, true, maxAmount, (amount) => onChange({ ...recipient, amount }))

  const handleSelect = (result: RecipientSearchResult): void => {
    const accepted = result.type === (isCore ? 'coreAddress' : 'platformAddress')
    setTypeError(!accepted)
    setIsEditing(!accepted)
    onChange({ ...recipient, address: accepted ? result.identifier : '' })
  }

  return (
    <div className='flex flex-col gap-3 p-4 rounded-[1rem] bg-dash-primary-dark-blue/[0.03] dark:bg-white/5'>
      <div className='flex items-center justify-between'>
        <Text size='sm' dim>Recipient {index + 1}</Text>
        {canRemove && (
          <button type='button' className='text-sm text-dash-brand cursor-pointer' onClick={onRemove}>Remove</button>
        )}
      </div>

      {isEditing
        ? (
          <RecipientSearchInput
            value={text}
            onChange={(value) => { setText(value); setTypeError(false); onChange({ ...recipient, address: '' }) }}
            onSelect={handleSelect}
            excludeIdentifier={excludeIdentifier}
            placeholder={RECIPIENT_PLACEHOLDERS[isCore ? 'core' : 'platformAddress']}
            allowCoreAddress={isCore}
            allowPlatformAddress={!isCore}
            network={network}
            filled
            autoFocus={recipient.address !== '' || text !== ''}
          />
          )
        : (
          <div className='flex items-center gap-3 px-3 py-4 rounded-2xl bg-dash-primary-dark-blue/[0.05] dark:bg-white/5'>
            <Identifier avatar highlight='both' ellipsis className='min-w-0 flex-1 !text-sm !font-light'>{recipient.address}</Identifier>
            <button
              type='button'
              onClick={() => { setText(recipient.address); setIsEditing(true) }}
              className='w-4 h-4 shrink-0 flex items-center justify-center opacity-35 hover:opacity-60 transition-opacity cursor-pointer'
              aria-label='Change address'
            >
              <SearchIcon className='text-dash-primary-dark-blue dark:text-white w-4 h-4' />
            </button>
          </div>
          )}

      <AmountInputSection
        amount={recipient.amount}
        equivalentAmount={usd}
        onAmountChange={setAmount}
        onEquivalentChange={setUsd}
        onQuickAmount={(percentage) => { if (maxAmount != null) setAmount(formatDashAmount(multiplyBigIntByPercentage(maxAmount, percentage), decimals)) }}
        selectedAsset='credits'
        assetDecimals={decimals}
        maxBalance={maxAmount != null && maxAmount > 0n ? formatDashAmount(maxAmount, decimals) : null}
        compact
      />

      {typeError && <Text size='xs' className='!text-red-500'>This is not a {isCore ? 'Dash Core' : 'Platform'} address.</Text>}
      {error != null && <Text size='xs' className='!text-red-500'>{error}</Text>}
    </div>
  )
}
