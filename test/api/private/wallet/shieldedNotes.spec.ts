import { SyncShieldedNotesHandler } from '../../../../src/content-script/api/private/wallet/syncShieldedNotes'
import { GetShieldedSyncStateHandler } from '../../../../src/content-script/api/private/wallet/getShieldedSyncState'
import { ShieldedService } from '../../../../src/content-script/services/ShieldedService'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { installWebLocks } from '../../../helpers/webLocks'

// A pool leaf: `owner` is the wallet whose viewing key recovers it, so the fake
// recoverNotes can play the part of trial-decryption.
interface PoolNote {
  owner: string
  value: bigint
  address: string
  nullifier: number
}

class TestStorage implements StorageAdapter {
  entries: Record<string, any> = {}
  async getAll (): Promise<object> {
    return JSON.parse(JSON.stringify(this.entries))
  }

  async get (key: string): Promise<any> {
    return JSON.parse(JSON.stringify(this.entries[key] ?? null))
  }

  async set (key: string, value: any): Promise<void> {
    this.entries[key] = JSON.parse(JSON.stringify(value))
  }

  async remove (key: string): Promise<void> {
    Reflect.deleteProperty(this.entries, key)
  }
}

const wallet = (walletId: string, type = 'seedphrase'): any => ({
  walletId,
  type,
  network: 'testnet',
  label: null,
  encryptedMnemonic: type === 'seedphrase' ? `encrypted_${walletId}` : null,
  seedHash: 'seedHash',
  currentIdentity: null
})

describe('shielded notes handlers', () => {
  let storage: TestStorage
  let pool: PoolNote[]
  let spent: Set<number>
  let wallets: any[]
  let shieldedAddressCount: number
  let walletRepository: any
  let sdk: any
  let sync: SyncShieldedNotesHandler
  let read: GetShieldedSyncStateHandler
  let restoreWebLocks: () => void
  let deriveSeed: jest.SpyInstance
  let nullifierStatuses: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    restoreWebLocks = installWebLocks()

    storage = new TestStorage()
    pool = []
    spent = new Set()
    wallets = [wallet('wallet1')]
    shieldedAddressCount = 2

    walletRepository = {
      getAll: jest.fn(async () => wallets),
      getCurrent: jest.fn(async () => wallets[0]),
      forScope: jest.fn(() => ({
        getShieldedAddressCount: jest.fn(async () => shieldedAddressCount)
      }))
    }

    sdk = {
      shielded: {
        getShieldedNotesCount: jest.fn(async () => BigInt(pool.length)),
        getShieldedEncryptedNotes: jest.fn(async (start: bigint, count: number) => pool.slice(Number(start), Number(start) + count)),
        // Trial-decryption: returns the passed notes this seed owns, numbered
        // from zero within what it was given.
        recoverNotes: jest.fn((notes: PoolNote[], seed: string) => notes
          .map((note, index) => ({ note, index }))
          .filter(entry => entry.note.owner === seed)
          .map(entry => ({
            index: entry.index,
            note: {
              value: entry.note.value,
              address: { toBech32m: () => entry.note.address },
              nullifier: entry.note.nullifier
            }
          })))
      }
    }

    const service = new ShieldedService(storage, sdk)

    // The seed stands in for the wallet, so the fake recoverNotes can tell whose
    // notes it is handed.
    deriveSeed = jest.spyOn(service, 'deriveSeed').mockImplementation((walletRecord: any) => walletRecord.walletId)
    jest.spyOn(service, 'deriveAddresses').mockImplementation((walletRecord: any, _password, account, count) => (
      Array.from({ length: count }, (_, diversifierIndex) => ({
        address: `orchard_${String(walletRecord.walletId)}_${diversifierIndex}`,
        derivationPath: `m/32'/1'/${account}'`,
        diversifierIndex
      }))
    ))
    jest.spyOn(service, 'noteNullifier').mockImplementation((recovered: any) => Uint8Array.from([recovered.note.nullifier]))
    nullifierStatuses = jest.spyOn(service, 'nullifierStatuses').mockImplementation(async (nullifiers: Uint8Array[]) => nullifiers.map(nullifier => ({
      nullifier,
      isSpent: spent.has(nullifier[0])
    })))

    sync = new SyncShieldedNotesHandler(walletRepository, service)
    read = new GetShieldedSyncStateHandler(walletRepository, service)
  })

  afterEach(() => {
    restoreWebLocks()
  })

  const runSync = async (payload: any = { password: 'password' }): Promise<any> => await sync.handle({
    context: 'dash-platform-extension', id: 'id', method: 'SYNC_SHIELDED_NOTES', type: 'request', payload
  } as any)

  const runRead = async (payload: any = {}): Promise<any> => await read.handle({
    context: 'dash-platform-extension', id: 'id', method: 'GET_SHIELDED_SYNC_STATE', type: 'request', payload
  } as any)

  it('stores the wallet notes, addresses and balance recovered from the pool', async () => {
    pool = [
      { owner: 'other', value: 1n, address: 'orchard_other_0', nullifier: 1 },
      { owner: 'wallet1', value: 700n, address: 'orchard_wallet1_0', nullifier: 2 },
      { owner: 'wallet1', value: 300n, address: 'orchard_wallet1_1', nullifier: 3 }
    ]

    const { wallets: [entry] } = await runSync()

    expect(entry.error).toBeUndefined()
    expect(entry.balance).toBe('1000')
    expect(entry.spendableNotes).toBe(2)
    expect(entry.fetched).toBe(3)
    expect(entry.total).toBe(3)
    expect(entry.addresses.map((address: any) => address.address)).toEqual(['orchard_wallet1_0', 'orchard_wallet1_1'])
    // Leaf positions of the notes in the pool, not their position among ours.
    expect(entry.notes.map((note: any) => [note.index, note.value, note.diversifierIndex]))
      .toEqual([[1, '700', 0], [2, '300', 1]])
    expect(storage.entries.shieldedNotes_testnet_wallet1['0'].notes).toHaveLength(2)
  })

  it('scans only what the pool gained since the last sync and keeps leaf positions', async () => {
    pool = [{ owner: 'wallet1', value: 700n, address: 'orchard_wallet1_0', nullifier: 2 }]
    await runSync()

    pool.push(
      { owner: 'other', value: 5n, address: 'orchard_other_0', nullifier: 4 },
      { owner: 'wallet1', value: 300n, address: 'orchard_wallet1_1', nullifier: 5 }
    )
    sdk.shielded.getShieldedEncryptedNotes.mockClear()

    const { wallets: [entry] } = await runSync()

    // Notes already scanned are read again, because the chunk holding the offset
    // is re-read, but they are neither trial-decrypted nor stored twice.
    expect(entry.notes.map((note: any) => note.index)).toEqual([0, 2])
    expect(entry.balance).toBe('1000')
    expect(entry.fetched).toBe(3)
  })

  // Platform serves whole chunks and rejects a read that starts inside one, so a
  // resumed scan rewinds to the chunk boundary below its offset.
  it('resumes reading at a chunk boundary', async () => {
    const filler = (index: number): PoolNote => ({ owner: 'other', value: 1n, address: 'orchard_other_0', nullifier: 100 + index })
    pool = Array.from({ length: 10_000 }, (_, index) => filler(index))
    pool[10] = { owner: 'wallet1', value: 700n, address: 'orchard_wallet1_0', nullifier: 2 }
    await runSync()

    pool.push({ owner: 'wallet1', value: 300n, address: 'orchard_wallet1_1', nullifier: 3 })
    sdk.shielded.getShieldedEncryptedNotes.mockClear()

    const { wallets: [entry] } = await runSync()

    expect(sdk.shielded.getShieldedEncryptedNotes.mock.calls[0][0]).toBe(8192n)
    expect(entry.notes.map((note: any) => note.index)).toEqual([10, 10_000])
    expect(entry.balance).toBe('1000')
    expect(entry.fetched).toBe(10_001)
  })

  it('does not read the pool again when nothing was added to it', async () => {
    pool = [{ owner: 'wallet1', value: 700n, address: 'orchard_wallet1_0', nullifier: 2 }]
    await runSync()
    sdk.shielded.getShieldedEncryptedNotes.mockClear()

    const { wallets: [entry] } = await runSync()

    expect(sdk.shielded.getShieldedEncryptedNotes).not.toHaveBeenCalled()
    // Spending still has to be re-checked: that is a nullifier query, not a scan.
    expect(nullifierStatuses).toHaveBeenCalled()
    expect(entry.balance).toBe('700')
    expect(entry.fetched).toBe(1)
  })

  it('reads the pool once for every wallet, starting at the furthest behind', async () => {
    wallets = [wallet('wallet1'), wallet('wallet2'), wallet('keystore1', 'keystore')]
    pool = [{ owner: 'wallet1', value: 700n, address: 'orchard_wallet1_0', nullifier: 2 }]
    await runSync({ password: 'password', walletId: 'wallet1' })

    pool.push({ owner: 'wallet2', value: 400n, address: 'orchard_wallet2_0', nullifier: 6 })
    sdk.shielded.getShieldedEncryptedNotes.mockClear()

    const { wallets: entries } = await runSync()

    // wallet2 has never synced, so the shared read starts at the pool's head.
    expect(sdk.shielded.getShieldedEncryptedNotes).toHaveBeenCalledTimes(1)
    expect(sdk.shielded.getShieldedEncryptedNotes.mock.calls[0][0]).toBe(0n)
    // The keystore wallet holds no seed, so it is not synced at all.
    expect(entries.map((entry: any) => [entry.walletId, entry.balance, entry.fetched]))
      .toEqual([['wallet1', '700', 2], ['wallet2', '400', 2]])
  })

  it('marks notes spent since the last sync and asks only about unspent ones', async () => {
    pool = [
      { owner: 'wallet1', value: 700n, address: 'orchard_wallet1_0', nullifier: 2 },
      { owner: 'wallet1', value: 300n, address: 'orchard_wallet1_1', nullifier: 3 }
    ]
    await runSync()

    spent.add(2)
    nullifierStatuses.mockClear()

    const { wallets: [entry] } = await runSync()

    expect(entry.balance).toBe('300')
    expect(entry.spendableNotes).toBe(1)
    expect(entry.notes.map((note: any) => note.isSpent)).toEqual([true, false])

    nullifierStatuses.mockClear()
    await runSync()

    // The spent note is never queried again: spending cannot be undone.
    expect(nullifierStatuses.mock.calls[0][0]).toHaveLength(1)
  })

  it('rescans from the start when the stored state claims more notes than the pool holds', async () => {
    pool = [
      { owner: 'wallet1', value: 700n, address: 'orchard_wallet1_0', nullifier: 2 },
      { owner: 'wallet1', value: 300n, address: 'orchard_wallet1_1', nullifier: 3 }
    ]
    await runSync()

    pool = [{ owner: 'wallet1', value: 700n, address: 'orchard_wallet1_0', nullifier: 2 }]
    sdk.shielded.getShieldedEncryptedNotes.mockClear()

    const { wallets: [entry] } = await runSync()

    expect(sdk.shielded.getShieldedEncryptedNotes.mock.calls[0][0]).toBe(0n)
    expect(entry.notes.map((note: any) => note.index)).toEqual([0])
    expect(entry.fetched).toBe(1)
  })

  it('reports a wallet that failed without dropping the others or its stored state', async () => {
    wallets = [wallet('wallet1'), wallet('wallet2')]
    pool = [
      { owner: 'wallet1', value: 700n, address: 'orchard_wallet1_0', nullifier: 2 },
      { owner: 'wallet2', value: 400n, address: 'orchard_wallet2_0', nullifier: 6 }
    ]
    await runSync()

    deriveSeed.mockImplementation((walletRecord: any) => {
      if (walletRecord.walletId === 'wallet2') {
        throw new Error('Failed to decrypt')
      }

      return walletRecord.walletId
    })
    pool.push({ owner: 'wallet2', value: 100n, address: 'orchard_wallet2_0', nullifier: 7 })

    const { wallets: entries } = await runSync()

    expect(entries[0]).toMatchObject({ walletId: 'wallet1', balance: '700' })
    expect(entries[0].error).toBeUndefined()
    expect(entries[1]).toMatchObject({ walletId: 'wallet2', balance: '400', error: 'Failed to decrypt' })
    // The failed wallet keeps what the previous sync stored.
    expect(storage.entries.shieldedNotes_testnet_wallet2['0'].fetched).toBe(2)
  })

  it('serves the stored state without a password and without touching the pool', async () => {
    pool = [{ owner: 'wallet1', value: 700n, address: 'orchard_wallet1_0', nullifier: 2 }]
    await runSync()

    deriveSeed.mockClear()
    sdk.shielded.getShieldedNotesCount.mockClear()
    sdk.shielded.getShieldedEncryptedNotes.mockClear()

    const entry = await runRead()

    expect(entry).toMatchObject({ walletId: 'wallet1', balance: '700', spendableNotes: 1, fetched: 1 })
    expect(entry.updatedAt).toBeGreaterThan(0)
    expect(deriveSeed).not.toHaveBeenCalled()
    expect(sdk.shielded.getShieldedNotesCount).not.toHaveBeenCalled()
    expect(sdk.shielded.getShieldedEncryptedNotes).not.toHaveBeenCalled()
  })

  it('answers an account that was never synced with an empty state', async () => {
    const entry = await runRead({ account: 3 })

    expect(entry).toMatchObject({ account: 3, balance: '0', spendableNotes: 0, notes: [], addresses: [], updatedAt: null })
  })

  it('validates the payloads', async () => {
    expect(sync.validatePayload({ password: '' } as any)).toBe('Password must be provided')
    expect(sync.validatePayload({ password: 'password', account: -1 } as any)).toBe('Account must be a non-negative integer')
    expect(sync.validatePayload({ password: 'password', account: 0 } as any)).toBeNull()
    expect(read.validatePayload({ account: 1.5 } as any)).toBe('Account must be a non-negative integer')
    expect(read.validatePayload({} as any)).toBeNull()
  })

  it('refuses to sync a wallet that cannot hold shielded funds', async () => {
    wallets = [wallet('keystore1', 'keystore')]

    await expect(runSync({ password: 'password', walletId: 'keystore1' }))
      .rejects.toThrow('Wallet keystore1 cannot hold shielded funds')
  })
})
