import { resolveTransferPair } from '../../../../utils'
import type { TransferCapabilities, TransferUnavailableReason } from '../../../../utils'
import type { AssetId, Direction, EndpointType } from '../types'
import { DIRECTION_DETAILS } from './directionConfig'
import type { DirectionConfig } from './directionConfig'

export type DirectionResolution =
  | { supported: true, direction: Direction, config: DirectionConfig }
  | { supported: false, direction: Direction, reason: TransferUnavailableReason }

// Resolves the wizard config of a from/to pair for the chosen asset and wallet.
export const resolveDirection = (from: EndpointType, to: EndpointType, asset: AssetId, capabilities: TransferCapabilities): DirectionResolution => {
  const pair = resolveTransferPair(from, to, asset, capabilities)

  if (!pair.supported) return pair

  const details = DIRECTION_DETAILS[pair.direction]

  if (details == null) return { supported: false, direction: pair.direction, reason: 'unsupportedPair' }

  return { supported: true, direction: pair.direction, config: { ...details, supported: true, mode: pair.mode } }
}
