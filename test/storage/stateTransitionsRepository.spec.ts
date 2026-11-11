import { DashPlatformSDK } from 'dash-platform-sdk'
import { StateTransitionWASM } from 'pshenmic-dpp'
import { MemoryStorageAdapter } from '../../src/content-script/storage/memoryStorageAdapter'
import { StateTransitionStatus } from '../../src/types/enums/StateTransitionStatus'
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
  signed: null,
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

  it('reports no signed copy on a record written before the field existed', async () => {
    const { signed, ...legacy } = recordOf('AAAA', { unsignedHash: hashOf(1) })

    await store({ [hashOf(1)]: legacy as StateTransitionStoreSchema })

    expect(await repository.getByHash(hashOf(1))).toHaveProperty('signed', null)
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

  // The store keeps both copies of an approved transition, so both have to
  // count against the budget.
  it('counts the signed copy against the store size budget', async () => {
    await store({
      [hashOf(1)]: recordOf('A'.repeat(MAX_STATE_TRANSITIONS_SIZE_BASE64 / 2), {
        status: 'approved',
        signed: 'B'.repeat(MAX_STATE_TRANSITIONS_SIZE_BASE64 / 2),
        resolvedAt: Date.now()
      })
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

  describe('recording the decision', () => {
    const sdk = new DashPlatformSDK({ network: 'testnet' })

    const transition = (identityNonce: bigint): StateTransitionWASM =>
      sdk.identities.createStateTransition('creditTransfer', {
        identityId: 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR',
        recipientId: 'Aa1ZUSjKsQDNJTV53NYs7PtaxKjCxdegZrqeywFy5y4M',
        amount: 1000n,
        identityNonce
      })

    const signed = (stateTransitionWASM: StateTransitionWASM): StateTransitionWASM => {
      stateTransitionWASM.signature = new Uint8Array(65).fill(3)
      stateTransitionWASM.signaturePublicKeyId = 1

      return stateTransitionWASM
    }

    it('stores the signed transition next to the one that was queued', async () => {
      const queued = transition(1n)

      await repository.createFromEncoded(queued.base64(), queued.hash(true))

      const stateTransition = await repository.approve(queued.hash(true), signed(transition(1n)))

      expect(stateTransition.status).toBe('approved')
      expect(stateTransition.signature).toBe('03'.repeat(65))
      expect(stateTransition.signaturePublicKeyId).toBe(1)
      expect(stateTransition.signedHash).toBe(signed(transition(1n)).hash(false))
      expect(stateTransition.signed).not.toBe(stateTransition.unsigned)
    })

    // Approving can re-own a transition, which changes its unsigned hash. The
    // record still belongs to the hash the page is waiting on.
    it('keys the approval by the hash the record was created under', async () => {
      const queued = transition(1n)
      const rewritten = signed(transition(9n))

      await repository.createFromEncoded(queued.base64(), queued.hash(true))

      await repository.approve(queued.hash(true), rewritten)

      expect((await repository.getByHash(queued.hash(true)))?.status).toBe('approved')
      expect((await repository.getByHash(rewritten.hash(true)))).toBeNull()
    })

    it('refuses an approval carrying no signature', async () => {
      const queued = transition(1n)

      await repository.createFromEncoded(queued.base64(), queued.hash(true))

      await expect(repository.approve(queued.hash(true), transition(1n)))
        .rejects.toThrow('Signature is not available after approval')
    })

    it('records a rejection without the transition itself', async () => {
      await repository.createFromEncoded('AAAA', hashOf(1))

      const stateTransition = await repository.resolve(hashOf(1), StateTransitionStatus.rejected)

      expect(stateTransition.status).toBe('rejected')
      expect(stateTransition.signed).toBeNull()
      // Retention counts from the decision, so the store notes when it landed.
      expect((await stored())[hashOf(1)].resolvedAt).not.toBeNull()
    })

    it('records a broadcast failure with its reason', async () => {
      await repository.createFromEncoded('AAAA', hashOf(1))

      const stateTransition = await repository.resolve(hashOf(1), StateTransitionStatus.error, 'deadline has elapsed')

      expect(stateTransition.status).toBe('error')
      expect(stateTransition.error).toBe('deadline has elapsed')
    })

    it('refuses to record a decision on a record that is not there', async () => {
      await expect(repository.resolve(hashOf(7), StateTransitionStatus.rejected))
        .rejects.toThrow(`State transition with hash ${hashOf(7)} does not exist`)
    })
  })
})
