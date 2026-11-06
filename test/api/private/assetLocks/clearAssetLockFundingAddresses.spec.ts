import { ClearAssetLockFundingAddressesHandler } from '../../../../src/content-script/api/private/assetLocks/clearAssetLockFundingAddresses'
import { AssetLockFundingAddressesRepository } from '../../../../src/content-script/repository/AssetLockFundingAddressesRepository'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import type { AssetLockFundingAddressSchema } from '../../../../src/content-script/storage/storageSchema'
import { MessagingMethods } from '../../../../src/types/enums/MessagingMethods'
import type { EventData } from '../../../../src/types/EventData'

// A per-test adapter: MemoryStorageAdapter keeps its cache in a module-level
// object shared by every instance, which would leak state between these tests.
class TestStorageAdapter implements StorageAdapter {
  cache: Record<string, any> = {}

  getAll = async (): Promise<object> => this.cache
  get = async (key: string): Promise<any> => this.cache[key] ?? null
  set = async (key: string, value: any): Promise<void> => {
    this.cache[key] = value
  }

  remove = async (key: string): Promise<void> => {
    this.cache[key] = undefined
  }
}

const STORAGE_KEY = 'assetLockFundingAddresses_testnet_wallet1'
const SCOPE = { network: 'testnet', walletId: 'wallet1' } as const

const entry = (address: string, overrides: Partial<AssetLockFundingAddressSchema> = {}): AssetLockFundingAddressSchema => ({
  address,
  encryptedPrivateKey: 'deadbeef',
  used: false,
  ...overrides
})

const utxo = (amount: bigint, vout = 0): any => ({ txid: `${vout}`.padStart(64, '0'), vout, amount })

interface ClearHarness {
  handler: ClearAssetLockFundingAddressesHandler
  storage: TestStorageAdapter
  coreExplorer: { getAddressUtxos: jest.Mock }
  walletRepository: { getCurrent: jest.Mock }
}

// `balances` maps an address to what the chain reports for it; an address absent
// from it reads as empty.
const buildHarness = (
  entries: AssetLockFundingAddressSchema[] = [],
  balances: Record<string, any[]> = {}
): ClearHarness => {
  const storage = new TestStorageAdapter()

  storage.cache.network = 'testnet'
  storage.cache.currentWalletId = 'wallet1'
  storage.cache[STORAGE_KEY] = Object.fromEntries(entries.map(item => [item.address, item]))

  const walletRepository = {
    getCurrent: jest.fn(async () => ({ walletId: 'wallet1', network: 'testnet' }))
  } as any

  const coreExplorer = {
    getAddressUtxos: jest.fn(async (address: string) => balances[address] ?? [])
  } as any

  const handler = new ClearAssetLockFundingAddressesHandler(
    walletRepository,
    new AssetLockFundingAddressesRepository(storage),
    coreExplorer
  )

  return { handler, storage, coreExplorer, walletRepository }
}

const event = (payload: Record<string, any> = {}): EventData => ({
  context: 'dash-platform-extension',
  id: 'request-id',
  type: 'request',
  method: MessagingMethods.CLEAR_ASSET_LOCK_FUNDING_ADDRESSES,
  payload: { ...SCOPE, ...payload }
})

describe('ClearAssetLockFundingAddressesHandler', () => {
  it('deletes the whole store once every address is inert', async () => {
    const { handler, storage } = buildHarness([
      entry('yDONE1', { used: true, assetLockTxid: 'a'.repeat(64) }),
      entry('yDONE2', { used: true, assetLockTxid: 'b'.repeat(64) })
    ])

    expect(await handler.handle(event({}))).toEqual({ cleared: 2 })
    expect(storage.cache[STORAGE_KEY]).toBeUndefined()
  })

  it('is a no-op, not an error, when there is nothing to delete', async () => {
    const { handler } = buildHarness([])

    expect(await handler.handle(event({}))).toEqual({ cleared: 0 })
  })

  // The recovery screen exists to spend these. Deleting the record would destroy
  // the only copy of a key that was never derived from the seed.
  it('refuses while an address still has a deposit to recover', async () => {
    const { handler, storage } = buildHarness([
      entry('yDONE', { used: true }),
      entry('ySTRANDED')
    ])

    await expect(handler.handle(event({}))).rejects.toThrow(/ySTRANDED/)
    expect(storage.cache[STORAGE_KEY]).toBeDefined()
  })

  // `registrationIdentityIndex` lives in this record and is what lets
  // registerIdentity rebuild the exact asset lock that is already on L1.
  it('refuses while an asset lock is on L1 but its registration never finished', async () => {
    const { handler, storage } = buildHarness([
      entry('yCOMMITTED', { assetLockTxid: 'a'.repeat(64) })
    ])

    await expect(handler.handle(event({}))).rejects.toThrow(/asset lock on L1 whose registration never finished/)
    expect(storage.cache[STORAGE_KEY]).toBeDefined()
  })

  it('allows a finished registration, whose asset lock is already consumed', async () => {
    const { handler } = buildHarness([
      entry('yFINISHED', { used: true, assetLockTxid: 'a'.repeat(64), registrationIdentityIndex: 3 })
    ])

    expect(await handler.handle(event({}))).toEqual({ cleared: 1 })
  })

  // The local record says what this extension did, not what the network holds: a
  // deposit can arrive long after the operation that reserved the address ended.
  it('refuses when a spent-looking address still holds funds on chain', async () => {
    const { handler, storage } = buildHarness(
      [entry('yUSED', { used: true, assetLockTxid: 'a'.repeat(64) })],
      { yUSED: [utxo(50_000n)] }
    )

    await expect(handler.handle(event({}))).rejects.toThrow(/still holds unspent funds/)
    expect(storage.cache[STORAGE_KEY]).toBeDefined()
  })

  it('ignores a dust-free but genuinely empty address', async () => {
    const { handler } = buildHarness(
      [entry('yEMPTY', { used: true, assetLockTxid: 'a'.repeat(64) })],
      { yEMPTY: [] }
    )

    expect(await handler.handle(event({}))).toEqual({ cleared: 1 })
  })

  // An explorer that cannot answer must not read as "nothing left to lose".
  it('propagates an explorer failure instead of clearing anyway', async () => {
    const { handler, storage, coreExplorer } = buildHarness([entry('yDONE', { used: true })])

    coreExplorer.getAddressUtxos.mockRejectedValueOnce(new Error('explorer unavailable'))

    await expect(handler.handle(event({}))).rejects.toThrow(/explorer unavailable/)
    expect(storage.cache[STORAGE_KEY]).toBeDefined()
  })

  it('names every blocking address, not just the first', async () => {
    const { handler } = buildHarness([entry('yONE'), entry('yTWO')])

    await expect(handler.handle(event({}))).rejects.toThrow(/yONE, yTWO/)
  })

  it('only ever touches the scoped wallet and network', async () => {
    const { handler, storage } = buildHarness([entry('yMINE', { used: true })])

    storage.cache.assetLockFundingAddresses_testnet_wallet2 = { yOTHERS: entry('yOTHERS') }
    storage.cache.assetLockFundingAddresses_mainnet_wallet1 = { yMAINNET: entry('yMAINNET') }

    expect(await handler.handle(event({}))).toEqual({ cleared: 1 })
    expect(storage.cache[STORAGE_KEY]).toBeUndefined()
    expect(storage.cache.assetLockFundingAddresses_testnet_wallet2).toBeDefined()
    expect(storage.cache.assetLockFundingAddresses_mainnet_wallet1).toBeDefined()
  })

  it('falls back to the current wallet when no scope is given', async () => {
    const { handler, walletRepository } = buildHarness([entry('yMINE', { used: true })])

    const { cleared } = await handler.handle({
      context: 'dash-platform-extension',
      id: 'request-id',
      type: 'request',
      method: MessagingMethods.CLEAR_ASSET_LOCK_FUNDING_ADDRESSES,
      payload: {}
    })

    expect(walletRepository.getCurrent).toHaveBeenCalled()
    expect(cleared).toBe(1)
  })

  describe('validatePayload', () => {
    const validate = (payload: any): string | null =>
      new ClearAssetLockFundingAddressesHandler({} as any, {} as any, {} as any).validatePayload(payload)

    it('accepts an empty payload and a complete scope', () => {
      expect(validate({})).toBeNull()
      expect(validate({ network: 'mainnet', walletId: 'wallet1' })).toBeNull()
    })

    it('takes the scope pair together or not at all', () => {
      expect(validate({ network: 'testnet' })).toMatch(/together/)
      expect(validate({ walletId: 'wallet1' })).toMatch(/together/)
    })
  })
})
