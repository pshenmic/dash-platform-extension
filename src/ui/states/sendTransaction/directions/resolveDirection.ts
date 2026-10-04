import { resolveTransferPair } from '../../../../utils'
import type { TransferCapabilities, TransferUnavailableReason } from '../../../../utils'
import type { AssetId, CoinControlSelection, Direction, EndpointType } from '../types'
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

// Whether the transfer goes to a mocked backend method, by direction or by the Coin Control selection.
export const runsOnMock = (config: DirectionConfig, selection: CoinControlSelection): boolean =>
  config.usesMock ||
  selection.type === 'utxo' ||
  selection.type === 'shieldedNotes' ||
  (selection.type === 'platformInputs' && selection.inputs.length > 1)

// How many platform addresses Coin Control may pick: several only where a multi-input method exists.
export const maxPlatformInputs = (config: DirectionConfig): number =>
  config.mode === 'send' || config.mode === 'withdraw' ? Number.POSITIVE_INFINITY : 1
