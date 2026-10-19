import React, { useState } from 'react'
import { FaceIcon, Identifier, WalletIcon } from 'dash-ui-kit/react'
import { RecipientSearchInput } from '../../../../components/Identities'
import type { PinnedSuggestion } from '../../../../components/Identities'
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
  ownIdentities: string[]
  ownPlatformAddresses: string[]
  onRecipientChange: (recipient: string) => void
}

const ACCEPTED_TYPES: Record<EndpointType, RecipientTargetType> = {
  core: 'coreAddress',
  identity: 'identity',
  platformAddress: 'platformAddress',
  shielded: 'shieldAddress'
}

// Second row of the To card: recipient field matching the To type.
export function RecipientRow ({ draft, excludeIdentifier, network, ownCoreAddress, ownIdentities, ownPlatformAddresses, onRecipientChange }: RecipientRowProps): React.JSX.Element | null {
  const [text, setText] = useState(draft.to.recipient)
  const toType = draft.to.type

  if (isShieldToMyself(draft)) return null

  const otherIdentities = ownIdentities.filter(identifier => identifier !== excludeIdentifier)
  const otherPlatformAddresses = ownPlatformAddresses.filter(address => address !== excludeIdentifier)
  const pinned: PinnedSuggestion | null = toType === 'core' && ownCoreAddress != null
    ? {
        title: 'My Core address',
        icon: <WalletIcon size={14} />,
        recipients: [{
          result: { identifier: ownCoreAddress, type: 'coreAddress' },
          content: <Identifier highlight='both' middleEllipsis edgeChars={8} className='text-xs' disableCopy>{ownCoreAddress}</Identifier>
        }]
      }
    : toType === 'identity' && otherIdentities.length > 0
      ? {
          title: otherIdentities.length === 1 ? 'My identity' : 'My identities',
          description: `${otherIdentities.length} identities in this wallet`,
          icon: <FaceIcon size={14} />,
          recipients: otherIdentities.map(identifier => ({
            result: { identifier, type: 'identity' },
            content: <Identifier avatar highlight='both' ellipsis className='min-w-0 text-xs' disableCopy>{identifier}</Identifier>
          }))
        }
      : toType === 'platformAddress' && otherPlatformAddresses.length > 0
        ? {
            title: otherPlatformAddresses.length === 1 ? 'My Platform address' : 'My Platform addresses',
            description: `${otherPlatformAddresses.length} addresses in this wallet`,
            icon: <WalletIcon size={14} />,
            recipients: otherPlatformAddresses.map(address => ({
              result: { identifier: address, type: 'platformAddress' },
              content: <Identifier highlight='both' className='text-xs' disableCopy>{address}</Identifier>
            }))
          }
        : null

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
      pinned={pinned}
      network={network}
    />
  )
}
