export type ReceiveScope = 'all' | 'core' | 'platform' | 'identity'

export type ReceiveTargetType = 'core' | 'platformAddress' | 'shielded' | 'identity'

/** Top level of the picker: the same Core/Platform split the dashboards use. */
export type ReceiveLayer = 'core' | 'platform'

/** One place funds can be received into, ready to render as QR + address. */
export interface ReceiveTarget {
  type: ReceiveTargetType
  // Address or identity identifier - what the QR encodes and Copy yields.
  value: string
  layer: 'Core' | 'Platform'
  unit: 'Dash' | 'Credits'
  // Credits as a raw string, or null while unknown.
  balance: string | null
  explorerUrl: string | null
}

export const RECEIVE_LAYER_BY_TARGET: Record<ReceiveTargetType, 'Core' | 'Platform'> = {
  core: 'Core',
  platformAddress: 'Platform',
  shielded: 'Platform',
  identity: 'Platform'
}

/** Second level, shown only under Platform. */
export const PLATFORM_TARGET_TYPES: ReceiveTargetType[] = ['identity', 'platformAddress', 'shielded']

/**
 * Second-level labels stay short because the level above already says
 * "Platform" - spelling it out again both repeats it and overflows the popup.
 */
export const RECEIVE_TYPE_LABELS: Record<ReceiveTargetType, string> = {
  core: 'Core',
  platformAddress: 'Addresses',
  shielded: 'Shield',
  identity: 'Identity'
}

/** Unambiguous names, for the places with room to spell them out. */
export const RECEIVE_TYPE_FULL_LABELS: Record<ReceiveTargetType, string> = {
  core: 'Core Address',
  platformAddress: 'Platform Address',
  shielded: 'Shield Address',
  identity: 'Identity'
}

export function receiveLayerOf (type: ReceiveTargetType): ReceiveLayer {
  return type === 'core' ? 'core' : 'platform'
}

/** Where a scope lands before the user touches the picker. */
export const DEFAULT_TARGET_TYPE_BY_SCOPE: Record<ReceiveScope, ReceiveTargetType> = {
  all: 'platformAddress',
  core: 'core',
  platform: 'platformAddress',
  identity: 'identity'
}
