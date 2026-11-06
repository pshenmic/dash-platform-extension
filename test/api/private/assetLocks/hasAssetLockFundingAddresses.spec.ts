import { HasAssetLockFundingAddressesHandler } from '../../../../src/content-script/api/private/assetLocks/hasAssetLockFundingAddresses'
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

interface HasHarness {
  handler: HasAssetLockFundingAddressesHandler
  storage: TestStorageAdapter
  walletRepository: { getCurrent: jest.Mock }
}

const buildHarness = (entries: AssetLockFundingAddressSchema[] = []): HasHarness => {
  const storage = new TestStorageAdapter()

  storage.cache.network = 'testnet'
  storage.cache.currentWalletId = 'wallet1'

  if (entries.length > 0) {
    storage.cache[STORAGE_KEY] = Object.fromEntries(entries.map(item => [item.address, item]))
  }

  const walletRepository = {
    getCurrent: jest.fn(async () => ({ walletId: 'wallet1', network: 'testnet' }))
  } as any

  const handler = new HasAssetLockFundingAddressesHandler(
    walletRepository,
    new AssetLockFundingAddressesRepository(storage)
  )

  return { handler, storage, walletRepository }
}

const event = (payload: Record<string, any> = {}): EventData => ({
  context: 'dash-platform-extension',
  id: 'request-id',
  type: 'request',
  method: MessagingMethods.HAS_ASSET_LOCK_FUNDING_ADDRESSES,
  payload: { ...SCOPE, ...payload }
})

describe('HasAssetLockFundingAddressesHandler', () => {
  it('is false for a wallet that was never handed an address', async () => {
    const { handler } = buildHarness([])

    expect(await handler.handle(event({}))).toEqual({ hasAny: false })
  })

  it('is true for an unspent address', async () => {
    const { handler } = buildHarness([entry('yADDR1')])

    expect(await handler.handle(event({}))).toEqual({ hasAny: true })
  })

  // The point of asking this instead of listing recoverable addresses: the menu is
  // offered to anyone who had one, because a deposit can arrive long after the
  // operation that reserved the address was abandoned, and a spent-looking entry
  // is still worth a look.
  it('is true even when every entry is spent or committed', async () => {
    const spent = buildHarness([entry('yUSED', { used: true })])
    const committed = buildHarness([entry('yCOMMITTED', { assetLockTxid: 'a'.repeat(64) })])

    expect(await spent.handler.handle(event({}))).toEqual({ hasAny: true })
    expect(await committed.handler.handle(event({}))).toEqual({ hasAny: true })
  })

  it('is true for an entry with no key, which the recovery screen then reports', async () => {
    const { handler } = buildHarness([entry('yNOKEY', { encryptedPrivateKey: '' })])

    expect(await handler.handle(event({}))).toEqual({ hasAny: true })
  })

  it('does not read another wallet or another network', async () => {
    const { handler, storage } = buildHarness([])

    storage.cache.assetLockFundingAddresses_testnet_wallet2 = { yOTHERS: entry('yOTHERS') }
    storage.cache.assetLockFundingAddresses_mainnet_wallet1 = { yMAINNET: entry('yMAINNET') }

    expect(await handler.handle(event({}))).toEqual({ hasAny: false })
  })

  it('falls back to the current wallet when no scope is given', async () => {
    const { handler, walletRepository, storage } = buildHarness([])

    storage.cache[STORAGE_KEY] = { yMINE: entry('yMINE') }

    const { hasAny } = await handler.handle({
      context: 'dash-platform-extension',
      id: 'request-id',
      type: 'request',
      method: MessagingMethods.HAS_ASSET_LOCK_FUNDING_ADDRESSES,
      payload: {}
    })

    expect(walletRepository.getCurrent).toHaveBeenCalled()
    expect(hasAny).toBe(true)
  })

  it('throws rather than answering false when no wallet is chosen', async () => {
    const { handler, walletRepository } = buildHarness([])

    walletRepository.getCurrent.mockResolvedValueOnce(null)

    await expect(handler.handle({
      context: 'dash-platform-extension',
      id: 'request-id',
      type: 'request',
      method: MessagingMethods.HAS_ASSET_LOCK_FUNDING_ADDRESSES,
      payload: {}
    })).rejects.toThrow(/No wallet is chosen/)
  })

  describe('validatePayload', () => {
    const validate = (payload: any): string | null =>
      new HasAssetLockFundingAddressesHandler({} as any, {} as any).validatePayload(payload)

    it('accepts an empty payload and a complete scope', () => {
      expect(validate({})).toBeNull()
      expect(validate({ network: 'testnet', walletId: 'wallet1' })).toBeNull()
    })

    it('takes the scope pair together or not at all', () => {
      expect(validate({ network: 'testnet' })).toMatch(/together/)
      expect(validate({ walletId: 'wallet1' })).toMatch(/together/)
      expect(validate({ network: 'regtest', walletId: 'wallet1' })).toMatch(/testnet or mainnet/)
    })
  })
})
