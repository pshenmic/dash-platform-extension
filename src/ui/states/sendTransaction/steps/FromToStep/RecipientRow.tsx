import React, { useState } from 'react'
import { Identifier, WalletIcon } from 'dash-ui-kit/react'
import { RecipientSearchInput } from '../../../../components/Identities'
import type { PinnedRecipient } from '../../../../components/Identities'
import type { NetworkType } from '../../../../../types'
import { isShieldToMyself } from '../../../../../utils'
import type { RecipientSearchResult, RecipientTargetType } from '../../../../../utils'
import { RECIPIENT_PLACEHOLDERS } from '../../constants'
import type { EndpointType, TransferDraft } from '../../types'

interface RecipientRowProps {
  draft: TransferDraft
  excludeIdentifier: string | null
  network: NetworkType
  ownCoreAddress: string | null
  onRecipientChange: (recipient: string) => void
}

const ACCEPTED_TYPES: Record<EndpointType, RecipientTargetType> = {
  core: 'coreAddress',
  identity: 'identity',
  platformAddress: 'platformAddress',
  shielded: 'shieldAddress'
}

// Second row of the To card: recipient field matching the To type.
export function RecipientRow ({ draft, excludeIdentifier, network, ownCoreAddress, onRecipientChange }: RecipientRowProps): React.JSX.Element | null {
  const [text, setText] = useState(draft.to.recipient)
  const toType = draft.to.type

  if (isShieldToMyself(draft)) return null

  const pinnedRecipients: PinnedRecipient[] = toType === 'core' && ownCoreAddress != null
    ? [{
        result: { identifier: ownCoreAddress, type: 'coreAddress' },
        title: 'My Core address',
        description: <Identifier highlight='both' middleEllipsis edgeChars={8} className='text-xs' disableCopy>{ownCoreAddress}</Identifier>,
        icon: <WalletIcon size={14} />
      }]
    : []

  const handleSelect = (result: RecipientSearchResult): void => {
    const type = result.type ?? 'identity'
    onRecipientChange(type === ACCEPTED_TYPES[toType] ? result.identifier : '')
  }

  return (
    <RecipientSearchInput
      value={text}
      onChange={(value) => { setText(value); onRecipientChange('') }}
      onSelect={handleSelect}
      excludeIdentifier={excludeIdentifier}
      placeholder={RECIPIENT_PLACEHOLDERS[toType]}
      allowCoreAddress={toType === 'core'}
      allowPlatformAddress={toType === 'platformAddress'}
      allowShieldAddress={toType === 'shielded'}
      pinnedRecipients={pinnedRecipients}
      network={network}
    />
  )
}
