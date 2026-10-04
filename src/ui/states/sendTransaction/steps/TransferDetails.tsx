import React from 'react'
import { Avatar, Identifier, ShieldSmallIcon, Text } from 'dash-ui-kit/react'
import { SummaryRow } from '../../../components/cards'
import { FiatChip } from '../../../components/common'
import { ENDPOINT_TYPE_LABELS } from '../../../components/transfer'
import { dashAmountToUsd, formatDashAmount, PLATFORM_DASH_DECIMALS } from '../../../../utils'
import { isShieldToMyself } from './FromToStep/RecipientRow'
import type { SourceBalance } from '../hooks/useSourceBalance'
import type { EndpointType, TransferDraft } from '../types'

interface TransferDetailsProps {
  draft: TransferDraft
  amount: bigint
  balance: SourceBalance
  feeCredits: bigint | null
  rate: number | null
  showTotal?: boolean
}

const LAYER_SUFFIX: Record<EndpointType, string> = { core: '(L1)', identity: '(L2)', platformAddress: '(L2)', shielded: '' }

function IdentityValue ({ identifier }: { identifier: string }): React.JSX.Element {
  return (
    <div className='flex items-center gap-2 min-w-0'>
      <div className='w-5 h-5 rounded-full overflow-hidden shrink-0'>
        <Avatar username={identifier} className='w-5 h-5' />
      </div>
      <Identifier highlight='both' middleEllipsis edgeChars={5} className='!text-xs'>{identifier}</Identifier>
    </div>
  )
}

function TypeValue ({ type, label }: { type: EndpointType, label?: string }): React.JSX.Element {
  return (
    <Text size='xs' weight='medium' className='flex items-center gap-1'>
      {type === 'shielded' && <ShieldSmallIcon size={12} color='currentColor' className='text-dash-brand' />}
      <span className='font-bold'>{label ?? ENDPOINT_TYPE_LABELS[type]}</span>
      <span className='opacity-50'>{LAYER_SUFFIX[type]}</span>
    </Text>
  )
}

function AddressValue ({ address }: { address: string }): React.JSX.Element {
  return <Identifier highlight='both' middleEllipsis edgeChars={6} className='!text-xs'>{address}</Identifier>
}

const UsdChip = ({ label, accent }: { label: string | null, accent: boolean }): React.JSX.Element => (
  <FiatChip
    label={label}
    hide={false}
    className={`px-2 py-[3px] ${accent ? 'bg-dash-brand/10' : 'bg-dash-primary-dark-blue/5'}`}
    textClassName={accent ? '!text-dash-brand' : ''}
  />
)

const sourceValue = (draft: TransferDraft, sourceAddress: string | null): React.ReactNode => {
  if (draft.from.type === 'identity' && draft.from.identityId != null) return <IdentityValue identifier={draft.from.identityId} />
  if (sourceAddress != null) return <AddressValue address={sourceAddress} />
  if (draft.from.type === 'shielded') return <TypeValue type='shielded' label='Shielded balance' />
  return <TypeValue type={draft.from.type} />
}

const targetValue = (draft: TransferDraft): React.ReactNode => {
  const { type, recipient } = draft.to
  if (isShieldToMyself(draft)) return <TypeValue type='shielded' label='Your Shielded Balance' />
  if (type === 'identity') return <IdentityValue identifier={recipient} />
  if (type === 'core' && draft.from.type !== 'core') return <TypeValue type='core' />
  return <AddressValue address={recipient} />
}

// From / To / Network Fee rows (and Total on Confirm) of the transfer.
export function TransferDetails ({ draft, amount, balance, feeCredits, rate, showTotal = false }: TransferDetailsProps): React.JSX.Element {
  const isDash = draft.asset.type === 'dash'
  const feeLabel = feeCredits != null ? `~${formatDashAmount(feeCredits, PLATFORM_DASH_DECIMALS)} Dash` : 'Calculated when sending'
  const total = isDash && feeCredits != null && balance.decimals === PLATFORM_DASH_DECIMALS ? amount + feeCredits : amount

  return (
    <div className='flex flex-col gap-2.5'>
      <SummaryRow label='From:' value={sourceValue(draft, balance.sourceAddress)} />
      <SummaryRow label='To:' value={targetValue(draft)} />
      <div className='flex flex-col gap-1 rounded-[0.9375rem] bg-dash-primary-dark-blue/[0.03] dark:bg-white/5'>
        <SummaryRow
          label='Network Fee:'
          value={<><Text size='xs' weight='medium'>{feeLabel}</Text><UsdChip label={dashAmountToUsd(feeCredits, PLATFORM_DASH_DECIMALS, rate)} accent={false} /></>}
          className='!bg-transparent'
        />
        {showTotal && (
          <SummaryRow
            label={<Text size='sm' weight='medium'>Total Amount:</Text>}
            value={
              <>
                <Text size='sm'><span className='font-bold'>{formatDashAmount(total, balance.decimals)}</span> {balance.unit}</Text>
                {isDash && <UsdChip label={dashAmountToUsd(total, balance.decimals, rate)} accent />}
              </>
            }
            className='!bg-transparent'
          />
        )}
      </div>
    </div>
  )
}
