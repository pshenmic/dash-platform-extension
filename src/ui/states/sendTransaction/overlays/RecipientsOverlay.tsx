import React, { useState } from 'react'
import { Button, Input, PlusIcon, Select, Text } from 'dash-ui-kit/react'
import { OverlayMenu } from '../../../components/common'
import { PercentageSlider, Toggle } from '../../../components/controls'
import { RecipientSearchInput } from '../../../components/Identities'
import { checkRecipients, formatDashAmount, isDashInputAllowed, multiplyBigIntByPercentage, parseDashAmount } from '../../../../utils'
import type { RecipientSearchResult } from '../../../../utils'
import type { NetworkType } from '../../../../types'
import { MAX_RECIPIENTS, RECIPIENT_PLACEHOLDERS } from '../constants'
import type { TransferRecipient } from '../types'

interface RecipientsOverlayProps {
  isOpen: boolean
  isCore: boolean
  recipients: TransferRecipient[]
  changeAddress: string | null
  changeAddresses: string[]
  decimals: number
  available: bigint | null
  minAmount: bigint
  excludeIdentifier: string | null
  network: NetworkType
  onClose: () => void
  onApply: (recipients: TransferRecipient[], changeAddress: string | null) => void
}

interface RecipientCardProps {
  index: number
  recipient: TransferRecipient
  isCore: boolean
  decimals: number
  maxAmount: bigint
  error: string | null
  canRemove: boolean
  excludeIdentifier: string | null
  network: NetworkType
  onChange: (recipient: TransferRecipient) => void
  onRemove: () => void
}

const newRecipient = (): TransferRecipient => ({ id: String(Date.now() + Math.random()), address: '', amount: '' })

// One Advanced recipient: address, amount and slider up to what the others leave.
function RecipientCard ({ index, recipient, isCore, decimals, maxAmount, error, canRemove, excludeIdentifier, network, onChange, onRemove }: RecipientCardProps): React.JSX.Element {
  const [text, setText] = useState(recipient.address)
  const [typeError, setTypeError] = useState(false)
  const amount = parseDashAmount(recipient.amount, decimals) ?? 0n

  const handleSelect = (result: RecipientSearchResult): void => {
    const accepted = result.type === (isCore ? 'coreAddress' : 'platformAddress')
    setTypeError(!accepted)
    onChange({ ...recipient, address: accepted ? result.identifier : '' })
  }

  return (
    <div className='flex flex-col gap-3 p-3 rounded-[1rem] bg-dash-primary-dark-blue/[0.03] dark:bg-white/5'>
      <div className='flex items-center justify-between'>
        <Text size='xs' dim>Recipient {index + 1}</Text>
        {canRemove && (
          <button type='button' className='text-xs text-dash-brand cursor-pointer' onClick={onRemove}>Remove</button>
        )}
      </div>
      <RecipientSearchInput
        value={text}
        onChange={(value) => { setText(value); setTypeError(false); onChange({ ...recipient, address: '' }) }}
        onSelect={handleSelect}
        excludeIdentifier={excludeIdentifier}
        placeholder={RECIPIENT_PLACEHOLDERS[isCore ? 'core' : 'platformAddress']}
        allowCoreAddress={isCore}
        allowPlatformAddress={!isCore}
        network={network}
      />
      <Input
        value={recipient.amount}
        placeholder='0'
        onChange={(e) => { if (isDashInputAllowed(e.target.value, decimals)) onChange({ ...recipient, amount: e.target.value }) }}
        size='sm'
        className='w-full'
      />
      {maxAmount > 0n && (
        <PercentageSlider
          amount={formatDashAmount(amount, decimals)}
          maxBalance={formatDashAmount(maxAmount, decimals)}
          onPercentage={(percentage) => onChange({ ...recipient, amount: formatDashAmount(multiplyBigIntByPercentage(maxAmount, percentage), decimals) })}
          onClear={() => onChange({ ...recipient, amount: '' })}
        />
      )}
      {typeError && <Text size='xs' className='!text-red-500'>This is not a {isCore ? 'Dash Core' : 'Platform'} address.</Text>}
      {error != null && <Text size='xs' className='!text-red-500'>{error}</Text>}
    </div>
  )
}

// Advanced recipients screen: addresses with amounts and an optional Core change address; mounted fresh on every open.
export function RecipientsOverlay ({ isOpen, isCore, recipients, changeAddress, changeAddresses, decimals, available, minAmount, excludeIdentifier, network, onClose, onApply }: RecipientsOverlayProps): React.JSX.Element {
  const [list, setList] = useState<TransferRecipient[]>(recipients.length > 0 ? recipients : [newRecipient()])
  const [change, setChange] = useState<string | null>(changeAddress)
  const [showErrors, setShowErrors] = useState(false)

  const check = checkRecipients(list, decimals, minAmount)
  const overBalance = available != null && check.total > available
  const changeMissing = isCore && change === ''
  const canApply = check.isValid && !overBalance && !changeMissing

  const update = (next: TransferRecipient): void => setList(list.map(item => item.id === next.id ? next : item))
  const othersTotal = (id: string): bigint => list.filter(item => item.id !== id).reduce((sum, item) => sum + (parseDashAmount(item.amount, decimals) ?? 0n), 0n)

  return (
    <OverlayMenu isOpen={isOpen} onClose={onClose} title='Recipients' showBackButton onBack={onClose}>
      <div className='flex flex-col gap-4 min-h-full'>
        <Text size='xs' dim>
          <span className='font-bold text-dash-primary-dark-blue'>Choose amounts and addresses</span> that will receive transferred funds.
        </Text>

        <div className='flex items-center justify-between gap-2'>
          <Text size='xs' dim>
            Total: <span className='text-dash-primary-dark-blue'>{list.length} {list.length === 1 ? 'Recipient' : 'Recipients'} - {formatDashAmount(check.total, decimals)} Dash</span>
          </Text>
          <Button colorScheme='lightBlue' size='sm' disabled={list.length >= MAX_RECIPIENTS} onClick={() => setList([...list, newRecipient()])}>
            <PlusIcon size={12} /> Add Recipient
          </Button>
        </div>

        {isCore && (
          <div className='flex flex-col gap-2'>
            <Toggle checked={change != null} onChange={(on) => setChange(on ? '' : null)} label='Custom Change Address' />
            {change != null && (
              <Select
                value={change === '' ? undefined : change}
                onChange={(value: string) => setChange(value)}
                options={changeAddresses.map(address => ({ value: address, label: address }))}
                placeholder='Select change address'
                size='sm'
              />
            )}
          </div>
        )}

        <div className='flex flex-col gap-2'>
          {list.map((recipient, index) => (
            <RecipientCard
              key={recipient.id}
              index={index}
              recipient={recipient}
              isCore={isCore}
              decimals={decimals}
              maxAmount={available != null && available > othersTotal(recipient.id) ? available - othersTotal(recipient.id) : 0n}
              error={showErrors ? check.errors[recipient.id] ?? null : null}
              canRemove={list.length > 1}
              excludeIdentifier={excludeIdentifier}
              network={network}
              onChange={update}
              onRemove={() => setList(list.filter(item => item.id !== recipient.id))}
            />
          ))}
        </div>

        {overBalance && available != null && (
          <Text size='xs' className='!text-red-500'>Insufficient balance. Maximum is {formatDashAmount(available > 0n ? available : 0n, decimals)} Dash.</Text>
        )}

        <div className='sticky bottom-0 mt-auto flex gap-3 pt-3 bg-white dark:bg-gray-900'>
          <Button colorScheme='lightBlue' size='xl' className='flex-1' onClick={() => { setList([newRecipient()]); setChange(null) }}>
            Reset
          </Button>
          <Button
            colorScheme='brand'
            size='xl'
            className='flex-1'
            onClick={() => {
              if (!canApply) {
                setShowErrors(true)
                return
              }
              onApply(list, change)
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </OverlayMenu>
  )
}
