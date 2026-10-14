import React, { useEffect, useState } from 'react'
import { Button, PlusIcon, Text } from 'dash-ui-kit/react'
import { OverlayMenu } from '../../../components/common'
import { Toggle } from '../../../components/controls'
import { checkRecipients, formatDashAmount, parseDashAmount } from '../../../../utils'
import type { NetworkType } from '../../../../types'
import type { TransferRecipient } from '../types'
import { RecipientCard } from './RecipientCard'
import { ChangeAddressSelect } from './ChangeAddressSelect'

interface RecipientsOverlayProps {
  isOpen: boolean
  isCore: boolean
  recipients: TransferRecipient[]
  changeAddress: string | null
  changeAddresses: string[]
  decimals: number
  maxRecipients: number
  // Most the recipients can receive in total, by their number: each output adds to the fee; null while unknown.
  availableFor: (recipientCount: number) => bigint | null
  // Reports the edited count so its fee can be priced.
  onCountChange?: (recipientCount: number) => void
  minAmount: bigint
  rate: number | null
  excludeIdentifier: string | null
  network: NetworkType
  onClose: () => void
  onApply: (recipients: TransferRecipient[], changeAddress: string | null) => void
}

const newRecipient = (): TransferRecipient => ({ id: String(Date.now() + Math.random()), address: '', amount: '' })

// Advanced recipients screen: addresses with amounts and an optional Core change address; mounted fresh on every open.
export function RecipientsOverlay ({ isOpen, isCore, recipients, changeAddress, changeAddresses, decimals, maxRecipients, availableFor, onCountChange, minAmount, rate, excludeIdentifier, network, onClose, onApply }: RecipientsOverlayProps): React.JSX.Element {
  const [list, setList] = useState<TransferRecipient[]>(recipients.length > 0 ? recipients : [newRecipient()])
  const [change, setChange] = useState<string | null>(changeAddress)
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => { onCountChange?.(list.length) }, [list.length, onCountChange])

  const available = availableFor(list.length)
  const check = checkRecipients(list, decimals, minAmount)
  const overBalance = available != null && check.total > available
  const changeMissing = isCore && change === ''
  const canApply = check.isValid && !overBalance && !changeMissing

  const update = (next: TransferRecipient): void => setList(list.map(item => item.id === next.id ? next : item))
  const othersTotal = (id: string): bigint => list.filter(item => item.id !== id).reduce((sum, item) => sum + (parseDashAmount(item.amount, decimals) ?? 0n), 0n)

  return (
    <OverlayMenu isOpen={isOpen} onClose={onClose} title='Recipients' showBackButton onBack={onClose} titleClassName='!text-[2.125rem] !leading-[1.25] tracking-[-0.03em]'>
      <div className='flex flex-col gap-4 min-h-full'>
        <Text size='sm' weight='medium' dim>
          <span className='font-bold text-dash-primary-dark-blue'>Choose amounts and addresses</span> that will receive transferred funds.
        </Text>

        <div className='flex flex-col flex-1 gap-3 p-4 rounded-[1.5rem] bg-white shadow-[0_0_35px_0_rgba(12,28,51,0.08)] dark:bg-gray-900'>
          <div className='flex flex-col gap-1.5'>
            <Text size='md' dim>
              Total: <span className='text-dash-primary-dark-blue dark:text-white'>{list.length} {list.length === 1 ? 'Recipient' : 'Recipients'} - {formatDashAmount(check.total, decimals)} Dash</span>
            </Text>
            {overBalance && available != null && (
              <Text size='xs' className='!text-red-500'>Insufficient balance. Maximum is {formatDashAmount(available > 0n ? available : 0n, decimals)} Dash.</Text>
            )}
          </div>

          <div className='flex items-center justify-between gap-2'>
            {isCore ? <Toggle checked={change != null} onChange={(on) => setChange(on ? '' : null)} label='Custom Change Address' className='whitespace-nowrap' /> : <span />}
            <Button
              colorScheme='lightBlue'
              size='sm'
              className='!h-auto !min-h-0 !px-3 !py-1.5 !text-sm gap-2 shrink-0'
              disabled={list.length >= maxRecipients}
              onClick={() => setList([...list, newRecipient()])}
            >
              <PlusIcon size={12} /> Add Recipient
            </Button>
          </div>

          {isCore && change != null && (
            <ChangeAddressSelect
              addresses={changeAddresses}
              value={change}
              onChange={setChange}
              error={showErrors && changeMissing ? 'Select a change address.' : null}
            />
          )}

          <div className='flex flex-col gap-2'>
            {list.map((recipient, index) => (
              <RecipientCard
                key={recipient.id}
                index={index}
                recipient={recipient}
                isCore={isCore}
                decimals={decimals}
                maxAmount={available == null ? null : available > othersTotal(recipient.id) ? available - othersTotal(recipient.id) : 0n}
                rate={rate}
                error={showErrors ? check.errors[recipient.id] ?? null : null}
                canRemove={list.length > 1}
                excludeIdentifier={excludeIdentifier}
                network={network}
                onChange={update}
                onRemove={() => setList(list.filter(item => item.id !== recipient.id))}
              />
            ))}
          </div>

          <div className='sticky bottom-0 mt-auto flex gap-3 -mx-4 -mb-4 p-4 rounded-b-[1.5rem] bg-white dark:bg-gray-900'>
            <Button colorScheme='lightBlue' size='xl' className='flex-1' onClick={() => { setList([newRecipient()]); setChange(null); setShowErrors(false) }}>
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
      </div>
    </OverlayMenu>
  )
}
