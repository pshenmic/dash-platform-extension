import { createPageStateWatcher, isPageStateKey } from '../../src/content-script/watchPageState'
import { PageEvent, PageEventName, PageState } from '../../src/types/PageState'

const state = (overrides: Partial<PageState> = {}): PageState => ({
  network: 'testnet',
  walletId: 'wallet1',
  approved: true,
  identities: [],
  currentIdentity: null,
  ...overrides
})

describe('the page state watcher', () => {
  const origin = 'https://app.example.com'

  it('watches the keys that change what a website sees, and no others', () => {
    expect(['network', 'currentWalletId', 'appConnects_testnet_w1', 'identities_testnet_w1', 'wallet_testnet_w1'].every(isPageStateKey)).toBe(true)
    expect(['schema_version', 'passwordPublicKey', 'stateTransitions_testnet_w1'].some(isPageStateKey)).toBe(false)
  })

  it('stays quiet on the first look, which is only the baseline', async () => {
    const events: PageEvent[] = []
    const service: any = { snapshot: jest.fn(async () => state()) }

    await createPageStateWatcher(service, origin, event => events.push(event)).refresh()

    expect(service.snapshot).toHaveBeenCalledWith(origin)
    expect(events).toEqual([])
  })

  it('emits what changed since the previous look', async () => {
    const events: PageEvent[] = []
    const service: any = { snapshot: jest.fn() }

    service.snapshot
      .mockResolvedValueOnce(state())
      .mockResolvedValueOnce(state({ network: 'mainnet', approved: false, walletId: 'wallet2' }))

    const watcher = createPageStateWatcher(service, origin, event => events.push(event))

    await watcher.refresh()
    await watcher.refresh()

    expect(events.map(event => event.event)).toEqual([PageEventName.networkChanged])
  })

  it('serializes overlapping refreshes so a burst of writes is diffed in order', async () => {
    const events: PageEvent[] = []
    const snapshots = [state(), state({ currentIdentity: 'idA', identities: [{ identifier: 'idA' } as any] }), state({ approved: false })]
    const service: any = { snapshot: jest.fn(async () => snapshots.shift() ?? state({ approved: false })) }

    const watcher = createPageStateWatcher(service, origin, event => events.push(event))

    await Promise.all([watcher.refresh(), watcher.refresh(), watcher.refresh()])

    expect(events.map(event => event.event)).toEqual([
      PageEventName.identitiesChanged,
      PageEventName.identitiesChanged,
      PageEventName.disconnect
    ])
  })

  // Leaving a network and coming back passes through states the website may not
  // see; it still has to learn that the network is different when it may look
  // again, or it would act on the one it was last told about.
  it('reports a network change that happened while the website had no access', async () => {
    const events: PageEvent[] = []
    const service: any = { snapshot: jest.fn() }

    service.snapshot
      .mockResolvedValueOnce(state({ identities: [{ identifier: 'idA' } as any], currentIdentity: 'idA' }))
      .mockResolvedValueOnce(state({ network: 'mainnet', walletId: null, approved: false }))
      .mockResolvedValueOnce(state({ network: 'testnet', walletId: null, approved: false }))
      .mockResolvedValueOnce(state({ identities: [{ identifier: 'idA' } as any], currentIdentity: 'idA' }))

    const watcher = createPageStateWatcher(service, origin, event => events.push(event))

    await watcher.refresh()
    await watcher.refresh()
    await watcher.refresh()
    await watcher.refresh()

    expect(events.map(event => event.event)).toEqual([
      PageEventName.networkChanged,
      PageEventName.identitiesChanged,
      PageEventName.networkChanged,
      PageEventName.identitiesChanged
    ])
    expect(events[2].payload).toEqual({ network: 'testnet' })
  })

  it('keeps working after a failed look', async () => {
    const events: PageEvent[] = []
    const service: any = { snapshot: jest.fn() }

    service.snapshot
      .mockResolvedValueOnce(state())
      .mockRejectedValueOnce(new Error('storage is gone'))
      .mockResolvedValueOnce(state({ approved: false }))

    const watcher = createPageStateWatcher(service, origin, event => events.push(event))

    await watcher.refresh()
    await expect(watcher.refresh()).rejects.toThrow('storage is gone')
    await watcher.refresh()

    expect(events.map(event => event.event)).toEqual([PageEventName.disconnect])
  })
})
