import React from 'react'
import { Badge, Button, CreditsIcon, FilterIcon, PendingIcon, Text } from 'dash-ui-kit/react'
import { Checkbox, SideActionButton } from '../../../../components/controls'
import { EndpointTypeSelect } from '../../../../components/transfer'
import type { EndpointTypeOption } from '../../../../components/transfer'
import { InfoCard } from '../../../../components/common'
import { formatDashAmount, getSourceUnavailableReason } from '../../../../../utils'
import type { TransferCapabilities } from '../../../../../utils'
import type { NetworkType, TokenData } from '../../../../../types'
import { UNAVAILABLE_REASON_HINTS } from '../../constants'
import { FEE_PLACEHOLDER } from '../../directions/directionConfig'
import { resolveDirection } from '../../directions/resolveDirection'
import type { DirectionResolution } from '../../directions/resolveDirection'
import type { TransferDraftActions } from '../../hooks/useTransferDraft'
import type { SourceBalance } from '../../hooks/useSourceBalance'
import type { TransferFee } from '../../hooks/useTransferFee'
import type { EndpointType, SourceIdentity, TransferDraft } from '../../types'
import { EndpointCard } from './EndpointCard'
import { SourceRow } from './SourceRow'
import { RecipientRow, isShieldToMyself } from './RecipientRow'

interface FromToStepProps {
  draft: TransferDraft
  actions: TransferDraftActions
  resolution: DirectionResolution
  typeOrder: EndpointType[]
  capabilities: TransferCapabilities
  identities: SourceIdentity[]
  balance: SourceBalance
  rate: number | null
  shielded: React.ComponentProps<typeof SourceRow>['shielded']
  tokens: TokenData[]
  fee: TransferFee | null
  network: NetworkType
  canContinue: boolean
  recipientError: string | null
  onOpenAsset: () => void
  coinControlLabel: string
  recipientsLabel: string
  onOpenRecipients: () => void
  advancedSummary: React.ReactNode
  onOpenCoinControl: (() => void) | null
  onNext: () => void
}

// TODO: replace with a Coin Control icon once it is added to dash-ui-kit.
const COIN_CONTROL_ICON = <span className='text-sm font-bold leading-none'>C</span>

const tokenSymbol = (draft: TransferDraft, tokens: TokenData[]): string => {
  if (draft.asset.type !== 'token') return 'Dash'
  const { tokenId } = draft.asset
  const token = tokens.find(item => item.identifier === tokenId)
  return token?.localizations?.en?.singularForm ?? 'Token'
}

// Step 1 of the send wizard: where the funds come from and where they go.
export function FromToStep ({
  draft,
  actions,
  resolution,
  typeOrder,
  capabilities,
  identities,
  balance,
  rate,
  shielded,
  tokens,
  fee,
  network,
  canContinue,
  recipientError,
  onOpenAsset,
  coinControlLabel,
  recipientsLabel,
  onOpenRecipients,
  advancedSummary,
  onOpenCoinControl,
  onNext
}: FromToStepProps): React.JSX.Element {
  const fromOptions = typeOrder.map((type): EndpointTypeOption => {
    const reason = getSourceUnavailableReason(type, draft.asset, capabilities)
    const hint = reason != null ? UNAVAILABLE_REASON_HINTS[reason] : undefined
    return { type, disabled: reason != null, hint }
  })

  const toOptions = typeOrder.map((type): EndpointTypeOption => {
    const result = resolveDirection(draft.from.type, type, draft.asset, capabilities)
    return result.supported ? { type } : { type, disabled: true, hint: UNAVAILABLE_REASON_HINTS[result.reason] }
  })

  const infoCard = resolution.supported ? resolution.config.infoCard : undefined
  const feeText = fee != null ? `${formatDashAmount(fee.amount, fee.decimals)} Dash` : 'small'

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col'>
        <EndpointCard label='From' position='top'>
          <div className='flex gap-3'>
            <EndpointTypeSelect value={draft.from.type} options={fromOptions} onChange={(type) => actions.setFromType(type)} className='flex-1 min-w-0' />
            {draft.from.type === 'identity'
              ? (
                <SideActionButton
                  icon={<CreditsIcon className='w-4 h-4' />}
                  title='Asset'
                  subtitle={tokenSymbol(draft, tokens)}
                  onClick={onOpenAsset}
                  disabled={tokens.length === 0}
                  className='shrink-0 max-w-[45%]'
                />
                )
              : <SideActionButton icon={COIN_CONTROL_ICON} title='Coin Control' subtitle={coinControlLabel} onClick={onOpenCoinControl ?? undefined} disabled={onOpenCoinControl == null} className='shrink-0 max-w-[45%]' />}
          </div>
          <SourceRow
            draft={draft}
            identities={identities}
            onIdentityChange={(id) => actions.setFromIdentity(id)}
            balance={balance}
            rate={rate}
            shielded={shielded}
          />
        </EndpointCard>

        <EndpointCard
          label='To'
          position='bottom'
          headerAction={isShieldToMyself(draft) && <Checkbox checked disabled onChange={() => {}} label='Shield to Myself' />}
        >
          {draft.isAdvanced
            ? (
              <div className='flex gap-3'>
                <EndpointTypeSelect value={draft.to.type} options={toOptions} onChange={(type) => actions.setToType(type)} className='flex-1 min-w-0' />
                <SideActionButton icon={<FilterIcon size={16} />} title='Recipients' subtitle={recipientsLabel} onClick={onOpenRecipients} className='shrink-0 max-w-[45%]' />
              </div>
              )
            : <EndpointTypeSelect value={draft.to.type} options={toOptions} onChange={(type) => actions.setToType(type)} />}
          {!draft.isAdvanced && (
            <RecipientRow
              key={`${draft.from.type}-${draft.to.type}`}
              draft={draft}
              excludeIdentifier={draft.from.type === 'identity' ? draft.from.identityId : null}
              network={network}
              onRecipientChange={(recipient) => actions.setRecipient(recipient)}
            />
          )}
          {recipientError != null && <Text size='xs' className='!text-red-500'>{recipientError}</Text>}
        </EndpointCard>
      </div>

      {draft.isAdvanced && advancedSummary}

      {infoCard != null && (
        <InfoCard
          title={infoCard.title}
          appearance='plain'
          badge={infoCard.duration != null && (
            <Badge color='blue' variant='flat' size='xs' className='flex items-center gap-1'>
              <PendingIcon size={12} />
              {infoCard.duration}
            </Badge>
          )}
        >
          {infoCard.text.replace(FEE_PLACEHOLDER, feeText)}
        </InfoCard>
      )}

      <Button colorScheme='brand' size='xl' className='w-full' disabled={!canContinue} onClick={onNext}>
        Next
      </Button>
    </div>
  )
}
