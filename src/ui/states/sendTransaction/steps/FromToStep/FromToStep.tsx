import React from 'react'
import { Badge, Button, CreditsIcon, FilterIcon, PendingIcon, Text } from 'dash-ui-kit/react'
import { Checkbox, SideActionButton } from '../../../../components/controls'
import { EndpointCard, EndpointTypeSelect } from '../../../../components/transfer'
import type { EndpointTypeOption } from '../../../../components/transfer'
import { InfoCard } from '../../../../components/common'
import { canShieldToOthers, formatDashAmount, getSourceUnavailableReason, isShieldToMyself, shownFee } from '../../../../../utils'
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
import { SourceRow } from './SourceRow'
import { RecipientRow } from './RecipientRow'

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
  ownCoreAddress: string | null
  ownPlatformAddresses: string[]
  canContinue: boolean
  recipientError: string | null
  onOpenAsset: () => void
  recipientsLabel: string
  onOpenRecipients: () => void
  advancedSummary: React.ReactNode
  unfinishedOperations: React.ReactNode
  onNext: () => void
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
  ownCoreAddress,
  ownPlatformAddresses,
  canContinue,
  recipientError,
  onOpenAsset,
  recipientsLabel,
  onOpenRecipients,
  advancedSummary,
  unfinishedOperations,
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
  const showsShieldToMyself = draft.to.type === 'shielded' && draft.from.type !== 'shielded'
  const feeShown = shownFee(fee)
  const feeText = feeShown != null ? `${feeShown.isApproximate === true ? '~' : ''}${formatDashAmount(feeShown.amount, feeShown.decimals)} Dash` : 'small'

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col'>
        <EndpointCard label='From' position='top'>
          <div className='flex gap-3'>
            <EndpointTypeSelect value={draft.from.type} options={fromOptions} onChange={(type) => actions.setFromType(type)} className='flex-1 min-w-0' />
            {draft.from.type === 'identity' && (
              <SideActionButton
                icon={<CreditsIcon className='w-4 h-4' />}
                title='Asset'
                subtitle={balance.unit}
                onClick={onOpenAsset}
                disabled={tokens.length === 0}
                className='shrink-0 max-w-[45%]'
              />
            )}
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
          headerAction={showsShieldToMyself && (
            <Checkbox checked={isShieldToMyself(draft)} disabled={!canShieldToOthers(draft)} onChange={(value) => actions.setShieldToMyself(value)} label='Shield to Myself' />
          )}
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
              key={`${draft.from.type}-${draft.to.type}-${String(draft.to.shieldToMyself)}`}
              draft={draft}
              excludeIdentifier={draft.from.type === 'identity' ? draft.from.identityId : balance.sourceAddress}
              network={network}
              ownCoreAddress={ownCoreAddress}
              ownIdentities={identities.map(identity => identity.identifier)}
              ownPlatformAddresses={ownPlatformAddresses}
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

      {unfinishedOperations}

      <Button colorScheme='brand' size='xl' className='w-full' disabled={!canContinue} onClick={onNext}>
        Next
      </Button>
    </div>
  )
}
