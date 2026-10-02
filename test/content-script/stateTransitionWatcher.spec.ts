import { createStateTransitionWatcher, isStateTransitionKey } from '../../src/content-script/watchStateTransitions'
import { StateTransitionRequests } from '../../src/content-script/services/StateTransitionRequests'
import { PageEvent, PageEventName } from '../../src/types/PageState'
import { StateTransitionStatus } from '../../src/types/enums/StateTransitionStatus'

describe('the signing request watcher', () => {
  const unsignedHash = 'a'.repeat(64)

  let events: PageEvent[]
  let requests: StateTransitionRequests
  let repository: any

  const watcher = (): { refresh: () => Promise<void> } => createStateTransitionWatcher(repository, requests, event => events.push(event))

  beforeEach(() => {
    events = []
    requests = new StateTransitionRequests()
    repository = { getByHash: jest.fn(async () => ({ unsignedHash, status: StateTransitionStatus.pending })) }
  })

  it('watches the state transition store and nothing else', () => {
    expect(isStateTransitionKey('stateTransitions_testnet_w1')).toBe(true)
    expect(['network', 'appConnects_testnet_w1', 'identities_testnet_w1'].some(isStateTransitionKey)).toBe(false)
  })

  it('says nothing about a request this page did not send', async () => {
    await watcher().refresh()

    expect(repository.getByHash).not.toHaveBeenCalled()
    expect(events).toEqual([])
  })

  it('stays quiet while the request is unanswered', async () => {
    requests.track(unsignedHash)

    await watcher().refresh()

    expect(events).toEqual([])
    expect(requests.hashes.has(unsignedHash)).toBe(true)
  })

  it('reports the answer once and stops following the request', async () => {
    requests.track(unsignedHash)
    repository.getByHash.mockResolvedValue({ unsignedHash, status: StateTransitionStatus.approved })

    const following = watcher()

    await following.refresh()
    await following.refresh()

    expect(events).toEqual([{ event: PageEventName.stateTransitionResolved, payload: { unsignedHash, status: StateTransitionStatus.approved } }])
    expect(requests.hashes.has(unsignedHash)).toBe(false)
  })

  it('reports a rejection the same way', async () => {
    requests.track(unsignedHash)
    repository.getByHash.mockResolvedValue({ unsignedHash, status: StateTransitionStatus.rejected })

    await watcher().refresh()

    expect(events[0].payload).toEqual({ unsignedHash, status: StateTransitionStatus.rejected })
  })
})
