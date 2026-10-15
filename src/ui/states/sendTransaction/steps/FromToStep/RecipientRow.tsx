import React, { useState } from 'react'
import { RecipientSearchInput } from '../../../../components/Identities'
import type { NetworkType } from '../../../../../types'
import { isShieldToMyself } from '../../../../../utils'
import type { RecipientSearchResult, RecipientTargetType } from '../../../../../utils'
import { RECIPIENT_PLACEHOLDERS } from '../../constants'
import type { EndpointType, TransferDraft } from '../../types'

interface RecipientRowProps {
  draft: TransferDraft
  excludeIdentifier: string | null
  network: NetworkType
  onRecipientChange: (recipient: string) => void
}

const ACCEPTED_TYPES: Record<EndpointType, RecipientTargetType> = {
  core: 'coreAddress',
  identity: 'identity',
  platformAddress: 'platformAddress',
  shielded: 'shieldAddress'
}

// Second row of the To card: recipient field matching the To type.
export function RecipientRow ({ draft, excludeIdentifier, network, onRecipientChange }: RecipientRowProps): React.JSX.Element | null {
  const [text, setText] = useState(draft.to.recipient)
  const toType = draft.to.type

  if (isShieldToMyself(draft)) return null

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
      network={network}
    />
  )
}
