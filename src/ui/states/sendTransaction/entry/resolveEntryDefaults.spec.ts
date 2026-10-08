import { resolveEntryDefaults } from './resolveEntryDefaults'
import type { EntryParams } from './resolveEntryDefaults'
import type { TransferCapabilities } from '../../../../utils'

const SEED: TransferCapabilities = { hasCoreLayer: true, hasAddressLayer: true, hasPlatformAddresses: true }
const KEYSTORE: TransferCapabilities = { hasCoreLayer: false, hasAddressLayer: false, hasPlatformAddresses: false }

const params = (overrides: Partial<EntryParams>): EntryParams => ({
  scope: 'all',
  identityId: null,
  selectedToken: null,
  currentIdentityId: 'current',
  capabilities: SEED,
  ...overrides
})

const types = (overrides: Partial<EntryParams>): [string, string] => {
  const { draft } = resolveEntryDefaults(params(overrides))
  return [draft.from.type, draft.to.type]
}

describe('resolveEntryDefaults', () => {
  it('builds an empty Simple draft', () => {
    const { draft } = resolveEntryDefaults(params({}))

    expect(draft).toMatchObject({
      amount: '',
      isAdvanced: false,
      coinControl: { type: 'automatic' },
      recipients: [],
      changeAddress: null,
      asset: { type: 'dash' },
      to: { recipient: '', shieldToMyself: true }
    })
  })

  describe('home dashboard (scope=all)', () => {
    it('defaults to Core -> Core', () => {
      expect(types({ scope: 'all' })).toEqual(['core', 'core'])
    })

    it('uses the current identity for a keystore wallet', () => {
      const { draft } = resolveEntryDefaults(params({ scope: 'all', capabilities: KEYSTORE }))

      expect([draft.from.type, draft.to.type]).toEqual(['identity', 'identity'])
      expect(draft.from.identityId).toBe('current')
    })
  })

  describe('platform dashboard (scope=platform)', () => {
    it('defaults to Platform Address -> Platform Address with L2 types first', () => {
      const { draft, typeOrder } = resolveEntryDefaults(params({ scope: 'platform' }))

      expect([draft.from.type, draft.to.type]).toEqual(['platformAddress', 'platformAddress'])
      expect(typeOrder[typeOrder.length - 1]).toBe('core')
    })

    it('falls back to the current identity without platform addresses', () => {
      expect(types({ scope: 'platform', capabilities: { ...SEED, hasPlatformAddresses: false } })).toEqual(['identity', 'platformAddress'])
      expect(types({ scope: 'platform', capabilities: KEYSTORE })).toEqual(['identity', 'platformAddress'])
    })
  })

  describe('identity dashboard (scope=identity)', () => {
    it('preselects the identity from the URL with Dash', () => {
      const { draft, typeOrder } = resolveEntryDefaults(params({ scope: 'identity', identityId: 'X' }))

      expect([draft.from.type, draft.to.type]).toEqual(['identity', 'identity'])
      expect(draft.from.identityId).toBe('X')
      expect(draft.asset).toEqual({ type: 'dash' })
      expect(typeOrder).toEqual(['core', 'identity', 'platformAddress', 'shielded'])
    })

    it('uses the current identity when the URL has none', () => {
      expect(resolveEntryDefaults(params({ scope: 'identity', identityId: '' })).draft.from.identityId).toBe('current')
    })
  })

  describe('tokens tab (scope=identity + selectedToken)', () => {
    it('preselects the token and locks identity -> identity', () => {
      const { draft } = resolveEntryDefaults(params({ scope: 'identity', identityId: 'X', selectedToken: 'token-1' }))

      expect(draft.asset).toEqual({ type: 'token', tokenId: 'token-1' })
      expect([draft.from.type, draft.to.type]).toEqual(['identity', 'identity'])
      expect(draft.from.identityId).toBe('X')
    })

    it('ignores the token outside the identity scope', () => {
      expect(resolveEntryDefaults(params({ scope: 'all', selectedToken: 'token-1' })).draft.asset).toEqual({ type: 'dash' })
    })
  })

  describe('core dashboard (scope=core)', () => {
    it('defaults to Core -> Core', () => {
      expect(types({ scope: 'core' })).toEqual(['core', 'core'])
    })
  })
})
