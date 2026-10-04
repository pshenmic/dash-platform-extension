import { resolveDirection } from './resolveDirection'
import { DIRECTION_DETAILS, FEE_PLACEHOLDER } from './directionConfig'
import { ENDPOINT_TYPE_ORDER, fallbackTargetType } from '../../../../utils'
import type { TransferCapabilities } from '../../../../utils'
import type { AssetId, EndpointType, TransferMode } from '../types'

const SEED: TransferCapabilities = { hasCoreLayer: true, hasAddressLayer: true, hasPlatformAddresses: true }
const KEYSTORE: TransferCapabilities = { hasCoreLayer: false, hasAddressLayer: false, hasPlatformAddresses: false }
const NO_ADDRESSES: TransferCapabilities = { ...SEED, hasPlatformAddresses: false }

const DASH: AssetId = { type: 'dash' }
const TOKEN: AssetId = { type: 'token', tokenId: 'token-1' }

const MATRIX: Array<[EndpointType, EndpointType, TransferMode | null]> = [
  ['core', 'core', 'coreSend'],
  ['core', 'identity', 'coreTopUp'],
  ['core', 'platformAddress', 'coreFund'],
  ['core', 'shielded', 'coreShield'],
  ['identity', 'core', 'identityWithdraw'],
  ['identity', 'identity', 'creditTransfer'],
  ['identity', 'platformAddress', 'fund'],
  ['identity', 'shielded', null],
  ['platformAddress', 'core', 'withdraw'],
  ['platformAddress', 'identity', 'topup'],
  ['platformAddress', 'platformAddress', 'send'],
  ['platformAddress', 'shielded', 'shield'],
  ['shielded', 'core', 'shieldedWithdraw'],
  ['shielded', 'identity', null],
  ['shielded', 'platformAddress', 'unshield'],
  ['shielded', 'shielded', 'shieldedTransfer']
]

const supportedTargets = (from: EndpointType, asset: AssetId, capabilities: TransferCapabilities): EndpointType[] =>
  ENDPOINT_TYPE_ORDER.filter(to => resolveDirection(from, to, asset, capabilities).supported)

describe('resolveDirection', () => {
  describe('Dash matrix for a seed wallet', () => {
    it.each(MATRIX)('%s -> %s', (from, to, mode) => {
      const result = resolveDirection(from, to, DASH, SEED)

      if (mode == null) {
        expect(result).toEqual({ supported: false, direction: `${from}->${to}`, reason: 'unsupportedPair' })
        return
      }

      expect(result.supported).toBe(true)
      if (result.supported) {
        expect(result.direction).toBe(`${from}->${to}`)
        expect(result.config.mode).toBe(mode)
        expect(result.config.supported).toBe(true)
      }
    })
  })

  describe('token asset', () => {
    it('allows only identity -> identity as tokenTransfer', () => {
      const result = resolveDirection('identity', 'identity', TOKEN, SEED)

      expect(result.supported && result.config.mode).toBe('tokenTransfer')
      expect(supportedTargets('identity', TOKEN, SEED)).toEqual(['identity'])
    })

    it('disables non-identity senders', () => {
      for (const from of ['core', 'platformAddress', 'shielded'] as EndpointType[]) {
        expect(resolveDirection(from, 'identity', TOKEN, SEED)).toMatchObject({ supported: false, reason: 'tokenRequiresIdentity' })
      }
    })
  })

  describe('keystore wallet', () => {
    it('allows only identity as sender', () => {
      expect(resolveDirection('core', 'core', DASH, KEYSTORE)).toMatchObject({ supported: false, reason: 'noCoreLayer' })
      expect(resolveDirection('platformAddress', 'core', DASH, KEYSTORE)).toMatchObject({ supported: false, reason: 'noAddressLayer' })
      expect(resolveDirection('shielded', 'core', DASH, KEYSTORE)).toMatchObject({ supported: false, reason: 'noAddressLayer' })
    })

    it('lets identity send to Core, identity and platform address', () => {
      expect(supportedTargets('identity', DASH, KEYSTORE)).toEqual(['core', 'identity', 'platformAddress'])
    })
  })

  it('disables platform address sender without platform addresses', () => {
    expect(resolveDirection('platformAddress', 'core', DASH, NO_ADDRESSES)).toMatchObject({ supported: false, reason: 'noPlatformAddresses' })
    expect(resolveDirection('identity', 'platformAddress', DASH, NO_ADDRESSES).supported).toBe(true)
  })
})

describe('fallbackTargetType', () => {
  it('keeps a supported target', () => {
    expect(fallbackTargetType('core', 'shielded', DASH, SEED)).toBe('shielded')
  })

  it('switches to the first supported type in Core, Identity, Address, Shielded order', () => {
    expect(fallbackTargetType('identity', 'shielded', DASH, SEED)).toBe('core')
    expect(fallbackTargetType('shielded', 'identity', DASH, SEED)).toBe('core')
    expect(fallbackTargetType('identity', 'core', TOKEN, SEED)).toBe('identity')
  })

  it('returns null when the sender is unavailable', () => {
    expect(fallbackTargetType('core', 'core', DASH, KEYSTORE)).toBeNull()
  })
})

describe('DIRECTION_DETAILS', () => {
  it('has details exactly for supported Dash pairs', () => {
    for (const [from, to, mode] of MATRIX) {
      expect(DIRECTION_DETAILS[`${from}->${to}`] != null).toBe(mode != null)
    }
  })

  it('enables advanced only for core -> core and address -> address', () => {
    const advanced = Object.entries(DIRECTION_DETAILS).filter(([, details]) => details?.advanced).map(([direction]) => direction)

    expect(advanced.sort()).toEqual(['core->core', 'platformAddress->platformAddress'])
  })

  it('runs Core senders on the real API except Core -> Shielded', () => {
    for (const to of ['core', 'identity', 'platformAddress'] as const) {
      expect(DIRECTION_DETAILS[`core->${to}`]?.usesMock).toBe(false)
    }
    expect(DIRECTION_DETAILS['core->shielded']?.usesMock).toBe(true)
  })

  it('shows Progress for asset lock and withdrawal directions', () => {
    for (const direction of ['core->identity', 'core->platformAddress', 'core->shielded', 'identity->core', 'platformAddress->core'] as const) {
      expect(DIRECTION_DETAILS[direction]?.stages.length).toBeGreaterThan(1)
      expect(DIRECTION_DETAILS[direction]?.hashes).toEqual(['core', 'platform'])
    }
    expect(DIRECTION_DETAILS['core->core']?.stages).toEqual([])
    expect(DIRECTION_DETAILS['identity->identity']?.stages).toEqual([])
  })

  it('takes the withdrawal fee from the estimate instead of a hardcoded value', () => {
    const text = DIRECTION_DETAILS['identity->core']?.infoCard?.text ?? ''

    expect(text).toContain(FEE_PLACEHOLDER)
    expect(text).not.toContain('400,000,000')
  })
})
