import type { AssetId, Direction, EndpointType, TransferMode } from '../ui/states/sendTransaction/types'

// Wallet features that decide which endpoint types can be used.
export interface TransferCapabilities {
  hasCoreLayer: boolean
  hasAddressLayer: boolean
  hasPlatformAddresses: boolean
}

// Why an endpoint type or a pair cannot be used.
export type TransferUnavailableReason =
  | 'noCoreLayer'
  | 'noAddressLayer'
  | 'noPlatformAddresses'
  | 'tokenRequiresIdentity'
  | 'unsupportedPair'

export type TransferPairResolution =
  | { supported: true, direction: Direction, mode: TransferMode }
  | { supported: false, direction: Direction, reason: TransferUnavailableReason }

// Default order of endpoint types in selects and for the To fallback.
export const ENDPOINT_TYPE_ORDER: EndpointType[] = ['core', 'identity', 'platformAddress', 'shielded']

// Transfer mode for every Dash pair, 'unsupported' when there is no API for it.
const PAIR_MODES: Record<EndpointType, Record<EndpointType, TransferMode>> = {
  core: { core: 'coreSend', identity: 'coreTopUp', platformAddress: 'coreFund', shielded: 'coreShield' },
  identity: { core: 'identityWithdraw', identity: 'creditTransfer', platformAddress: 'fund', shielded: 'unsupported' },
  platformAddress: { core: 'withdraw', identity: 'topup', platformAddress: 'send', shielded: 'shield' },
  shielded: { core: 'shieldedWithdraw', identity: 'unsupported', platformAddress: 'unshield', shielded: 'shieldedTransfer' }
}

export const toDirection = (from: EndpointType, to: EndpointType): Direction => `${from}->${to}`

const isTokenAsset = (asset: AssetId): boolean => asset.type === 'token'

// Reason the type cannot be the sender, or null when it can.
export const getSourceUnavailableReason = (type: EndpointType, asset: AssetId, capabilities: TransferCapabilities): TransferUnavailableReason | null => {
  if (isTokenAsset(asset) && type !== 'identity') return 'tokenRequiresIdentity'
  if (type === 'core' && !capabilities.hasCoreLayer) return 'noCoreLayer'
  if ((type === 'platformAddress' || type === 'shielded') && !capabilities.hasAddressLayer) return 'noAddressLayer'
  if (type === 'platformAddress' && !capabilities.hasPlatformAddresses) return 'noPlatformAddresses'
  return null
}

// Resolves the transfer mode of a pair or the reason it is unavailable.
export const resolveTransferPair = (from: EndpointType, to: EndpointType, asset: AssetId, capabilities: TransferCapabilities): TransferPairResolution => {
  const direction = toDirection(from, to)
  const sourceReason = getSourceUnavailableReason(from, asset, capabilities)

  if (sourceReason != null) return { supported: false, direction, reason: sourceReason }

  if (isTokenAsset(asset)) {
    return to === 'identity'
      ? { supported: true, direction, mode: 'tokenTransfer' }
      : { supported: false, direction, reason: 'tokenRequiresIdentity' }
  }

  if (to === 'shielded' && !capabilities.hasAddressLayer) return { supported: false, direction, reason: 'noAddressLayer' }

  const mode = PAIR_MODES[from][to]

  return mode === 'unsupported'
    ? { supported: false, direction, reason: 'unsupportedPair' }
    : { supported: true, direction, mode }
}

// Keeps the current To type when the pair works, otherwise picks the first available one.
export const fallbackTargetType = (from: EndpointType, current: EndpointType, asset: AssetId, capabilities: TransferCapabilities): EndpointType | null => {
  if (resolveTransferPair(from, current, asset, capabilities).supported) return current

  return ENDPOINT_TYPE_ORDER.find(type => resolveTransferPair(from, type, asset, capabilities).supported) ?? null
}
