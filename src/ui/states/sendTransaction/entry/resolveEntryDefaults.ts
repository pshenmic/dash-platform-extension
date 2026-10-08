import { ENDPOINT_TYPE_ORDER, fallbackTargetType, getSourceUnavailableReason } from '../../../../utils'
import type { TransferCapabilities } from '../../../../utils'
import type { AssetId, EndpointType, SendScope, TransferDraft } from '../types'

export interface EntryParams {
  scope: SendScope
  identityId: string | null
  selectedToken: string | null
  currentIdentityId: string | null
  capabilities: TransferCapabilities
}

export interface EntryDefaults {
  draft: TransferDraft
  typeOrder: EndpointType[]
}

const PREFERRED_TYPES: Record<SendScope, { from: EndpointType, to: EndpointType }> = {
  all: { from: 'core', to: 'core' },
  core: { from: 'core', to: 'core' },
  platform: { from: 'platformAddress', to: 'platformAddress' },
  identity: { from: 'identity', to: 'identity' }
}

const L2_FIRST_ORDER: EndpointType[] = ['identity', 'platformAddress', 'shielded', 'core']

// Builds the initial wizard draft for the dashboard the send screen was opened from.
export const resolveEntryDefaults = ({ scope, identityId, selectedToken, currentIdentityId, capabilities }: EntryParams): EntryDefaults => {
  const scopeIdentity = scope === 'identity' && identityId != null && identityId !== '' ? identityId : null
  const asset: AssetId = scopeIdentity != null && selectedToken != null && selectedToken !== ''
    ? { type: 'token', tokenId: selectedToken }
    : { type: 'dash' }

  let { from, to } = PREFERRED_TYPES[scope]

  if (getSourceUnavailableReason(from, asset, capabilities) != null) {
    from = 'identity'
    if (scope === 'all') to = 'identity'
  }

  return {
    draft: {
      from: { type: from, identityId: scopeIdentity ?? currentIdentityId },
      to: { type: fallbackTargetType(from, to, asset, capabilities) ?? to, recipient: '', shieldToMyself: true },
      asset,
      amount: '',
      isAdvanced: false,
      coinControl: { type: 'automatic' },
      recipients: [],
      changeAddress: null
    },
    typeOrder: scope === 'platform' ? L2_FIRST_ORDER : ENDPOINT_TYPE_ORDER
  }
}
