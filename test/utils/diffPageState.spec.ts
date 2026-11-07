import { diffPageState } from '../../src/utils/diffPageState'
import { PageEventName, PageState } from '../../src/types/PageState'
import { IdentityType } from '../../src/types/enums/IdentityType'

const identity = (identifier: string): any => ({ identifier, type: IdentityType.regular, proTxHash: null })

const state = (overrides: Partial<PageState> = {}): PageState => ({
  network: 'testnet',
  walletId: 'wallet1',
  connected: true,
  identities: [identity('idA')],
  currentIdentity: 'idA',
  ...overrides
})

// What a website is told after something changed in the extension.
describe('diffPageState', () => {
  it('says nothing when nothing a website can see changed', () => {
    expect(diffPageState(state(), state())).toEqual([])
  })

  it('says nothing at all to a website that is not connected', () => {
    const before = state({ connected: false, identities: [], currentIdentity: null })
    const after = state({ connected: false, identities: [], currentIdentity: null, network: 'mainnet', walletId: 'wallet2' })

    expect(diffPageState(before, after)).toEqual([])
  })

  it('reports a network switch', () => {
    const events = diffPageState(state(), state({ network: 'mainnet', identities: [], currentIdentity: null, connected: false, walletId: 'wallet2' }))

    expect(events.map(event => event.event)).toEqual([PageEventName.networkChanged, PageEventName.identitiesChanged])
    expect(events[0].payload).toEqual({ network: 'mainnet' })
  })

  it('reports a wallet switch as an empty identity list, not as a disconnect', () => {
    const events = diffPageState(state(), state({ walletId: 'wallet2', connected: false, identities: [], currentIdentity: null }))

    expect(events.map(event => event.event)).toEqual([PageEventName.identitiesChanged])
    expect(events[0].payload).toEqual({ identities: [], currentIdentity: null })
  })

  it('reports a revoked connection as a disconnect', () => {
    const events = diffPageState(state(), state({ connected: false, identities: [], currentIdentity: null }))

    expect(events.map(event => event.event)).toEqual([PageEventName.identitiesChanged, PageEventName.disconnect])
  })

  it('reports an identity the user added to the grant', () => {
    const events = diffPageState(state(), state({ identities: [identity('idA'), identity('idB')] }))

    expect(events.map(event => event.event)).toEqual([PageEventName.identitiesChanged])
    expect((events[0].payload as any).identities.map((entry: any) => entry.identifier)).toEqual(['idA', 'idB'])
  })

  it('reports a change of the current identity alone', () => {
    const events = diffPageState(
      state({ identities: [identity('idA'), identity('idB')] }),
      state({ identities: [identity('idA'), identity('idB')], currentIdentity: 'idB' })
    )

    expect(events.map(event => event.event)).toEqual([PageEventName.identitiesChanged])
    expect((events[0].payload as any).currentIdentity).toBe('idB')
  })

  it('tells a website that has just been approved what it may see', () => {
    const before = state({ connected: false, identities: [], currentIdentity: null })

    expect(diffPageState(before, state()).map(event => event.event)).toEqual([PageEventName.identitiesChanged])
  })
})
