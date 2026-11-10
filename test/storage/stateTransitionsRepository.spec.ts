import { MemoryStorageAdapter } from '../../src/content-script/storage/memoryStorageAdapter'
import { StateTransitionsRepository } from '../../src/content-script/repository/StateTransitionsRepository'
import {
  MAX_STATE_TRANSITION_SIZE_BASE64,
  MAX_STATE_TRANSITIONS_SIZE_BASE64,
  MAX_STORED_STATE_TRANSITIONS,
  STATE_TRANSITION_PENDING_TTL_MS,
  STATE_TRANSITION_RESOLVED_TTL_MS
} from '../../src/constants'
import type {
  StateTransitionsStoreSchema,
  StateTransitionStoreSchema
} from '../../src/content-script/storage/storageSchema'

const STORAGE_KEY = 'stateTransitions_testnet_wallet1'

const hashOf = (n: number): string => n.toString(16).padStart(64, '0')

const recordOf = (unsigned: string, overrides: Partial<StateTransitionStoreSchema> = {}): StateTransitionStoreSchema => ({
  unsignedHash: hashOf(0),
  signedHash: null,
  unsigned,
  signature: null,
  signaturePublicKeyId: null,
  status: 'pending',
  error: null,
  origin: null,
  createdAt: Date.now(),
  resolvedAt: null,
  ...overrides
})

// The store takes page-written bytes, so it has to stay bounded even when a
// connected site keeps queueing transitions the user never resolves.
describe('the transition store', () => {
  let storage: MemoryStorageAdapter
  let repository: StateTransitionsRepository

  const store = async (records: StateTransitionsStoreSchema): Promise<void> =>
    await storage.set(STORAGE_KEY, records)

  const stored = async (): Promise<StateTransitionsStoreSchema> =>
    (await storage.get(STORAGE_KEY) ?? {}) as StateTransitionsStoreSchema

  beforeEach(async () => {
    storage = new MemoryStorageAdapter()
    repository = new StateTransitionsRepository(storage)

    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', 'wallet1')
    await store({})
  })

  it('keeps the origin the page asked from', async () => {
    const response = await repository.createFromEncoded('AAAA', hashOf(1), 'https://app.example.com')

    expect(response.origin).toBe('https://app.example.com')
    expect((await repository.getByHash(hashOf(1)))?.origin).toBe('https://app.example.com')
  })

  it('refuses a key that is not a 32-byte hex digest', async () => {
    await expect(repository.createFromEncoded('AAAA', 'not-a-hash'))
      .rejects.toThrow('State transition hash is not valid')
  })

  it('refuses a transition larger than the per-transition bound', async () => {
    await expect(repository.createFromEncoded('A'.repeat(MAX_STATE_TRANSITION_SIZE_BASE64 + 1), hashOf(1)))
      .rejects.toThrow('State transition is too large')
  })

  it('forgets a pending record the page has stopped polling', async () => {
    await store({
      [hashOf(1)]: recordOf('AAAA', { createdAt: Date.now() - STATE_TRANSITION_PENDING_TTL_MS - 1000 })
    })

    await repository.createFromEncoded('BBBB', hashOf(2))

    const records = await stored()
    expect(records[hashOf(1)]).toBeUndefined()
    expect(records[hashOf(2)]).toBeDefined()
  })

  it('keeps a pending record while the page can still be polling it', async () => {
    await store({
      [hashOf(1)]: recordOf('AAAA', { createdAt: Date.now() - STATE_TRANSITION_PENDING_TTL_MS / 2 })
    })

    await repository.createFromEncoded('BBBB', hashOf(2))

    expect((await stored())[hashOf(1)]).toBeDefined()
  })

  it('forgets a resolved record after the resolved retention', async () => {
    await store({
      [hashOf(1)]: recordOf('AAAA', {
        status: 'approved',
        createdAt: Date.now() - STATE_TRANSITION_RESOLVED_TTL_MS - 2000,
        resolvedAt: Date.now() - STATE_TRANSITION_RESOLVED_TTL_MS - 1000
      })
    })

    await repository.createFromEncoded('BBBB', hashOf(2))

    expect((await stored())[hashOf(1)]).toBeUndefined()
  })

  it('refuses to grow past the store size budget', async () => {
    await store({
      [hashOf(1)]: recordOf('A'.repeat(MAX_STATE_TRANSITIONS_SIZE_BASE64 - 8))
    })

    await expect(repository.createFromEncoded('A'.repeat(16), hashOf(2)))
      .rejects.toThrow('Too many state transitions are waiting for approval')
  })

  it('refuses to grow past the record count cap', async () => {
    const records: StateTransitionsStoreSchema = {}

    for (let i = 0; i < MAX_STORED_STATE_TRANSITIONS; i++) {
      records[hashOf(i)] = recordOf('A')
    }

    await store(records)

    await expect(repository.createFromEncoded('A', hashOf(MAX_STORED_STATE_TRANSITIONS)))
      .rejects.toThrow('Too many state transitions are waiting for approval')
  })
})
