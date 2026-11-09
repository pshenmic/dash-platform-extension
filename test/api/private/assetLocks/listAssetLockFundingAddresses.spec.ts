import { ListAssetLockFundingAddressesHandler } from '../../../../src/content-script/api/private/assetLocks/listAssetLockFundingAddresses'
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

interface ListHarness {
  handler: ListAssetLockFundingAddressesHandler
  storage: TestStorageAdapter
  coreExplorer: { getAddressUtxos: jest.Mock }
  walletRepository: { getCurrent: jest.Mock }
}

const buildHarness = (
  entries: AssetLockFundingAddressSchema[] = [],
  utxosByAddress: Record<string, any[]> = {}
): ListHarness => {
  const storage = new TestStorageAdapter()

  storage.cache.network = 'testnet'
  storage.cache.currentWalletId = 'wallet1'
  storage.cache[STORAGE_KEY] = Object.fromEntries(entries.map(item => [item.address, item]))

  const walletRepository = {
    getCurrent: jest.fn(async () => ({ walletId: 'wallet1', network: 'testnet' }))
  } as any

  const coreExplorer = {
    getAddressUtxos: jest.fn(async (address: string) => utxosByAddress[address] ?? [])
  } as any

  const handler = new ListAssetLockFundingAddressesHandler(
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
  method: MessagingMethods.LIST_ASSET_LOCK_FUNDING_ADDRESSES,
  payload: { ...SCOPE, ...payload }
})

describe('ListAssetLockFundingAddressesHandler', () => {
  // The whole point of listing everything: the screen offers a button that deletes
  // these entries and their one-time keys, so nothing may be deleted that the user
  // was not shown.
  it('lists every entry, whatever its state', async () => {
    const { handler } = buildHarness([
      entry('yRECOVERABLE'),
      entry('yCOMMITTED', { assetLockTxid: 'a'.repeat(64) }),
      entry('ySPENT', { used: true, assetLockTxid: 'b'.repeat(64) })
    ])

    const { addresses } = await handler.handle(event({}))

    expect(addresses.map(address => address.state)).toEqual(['recoverable', 'committed', 'spent'])
  })

  it('calls a completed entry spent, not merely used', async () => {
    const { handler } = buildHarness([
      entry('yDONE', { used: true, assetLockTxid: 'a'.repeat(64), registrationIdentityIndex: 2 }),
      entry('yUSED_NO_LOCK', { used: true })
    ])

    const { addresses } = await handler.handle(event({}))

    expect(addresses.map(address => address.state)).toEqual(['spent', 'spent'])
  })

  it('reads storage only when balances are not asked for', async () => {
    const { handler, coreExplorer } = buildHarness([entry('yADDR1'), entry('yADDR2')])

    const { addresses } = await handler.handle(event({}))

    expect(coreExplorer.getAddressUtxos).not.toHaveBeenCalled()
    expect(addresses.every(address => address.balanceDuffs === null)).toBe(true)
    expect(addresses.every(address => address.utxoCount === null)).toBe(true)
  })

  // A zero next to a spent entry is what tells the user there is nothing left
  // there to lose, so spent addresses get read too.
  it('reads the balance of every address, spent ones included', async () => {
    const { handler, coreExplorer } = buildHarness(
      [entry('yRECOVERABLE'), entry('ySPENT', { used: true })],
      { yRECOVERABLE: [utxo(60_000n), utxo(40_000n, 1)], ySPENT: [] }
    )

    const { addresses } = await handler.handle(event({ withBalances: true }))

    expect(coreExplorer.getAddressUtxos).toHaveBeenCalledTimes(2)
    expect(addresses.find(address => address.address === 'yRECOVERABLE')?.balanceDuffs).toBe('100000')
    expect(addresses.find(address => address.address === 'yRECOVERABLE')?.utxoCount).toBe(2)
    expect(addresses.find(address => address.address === 'ySPENT')?.balanceDuffs).toBe('0')
  })

  it('reports an entry with no stored key as one that cannot be signed for', async () => {
    const { handler } = buildHarness([
      entry('yHASKEY'),
      entry('yNOKEY', { encryptedPrivateKey: '' })
    ])

    const { addresses } = await handler.handle(event({}))

    expect(addresses.find(address => address.address === 'yHASKEY')?.hasKey).toBe(true)
    expect(addresses.find(address => address.address === 'yNOKEY')?.hasKey).toBe(false)
  })

  it('carries the committed asset lock and who the address was reserved for', async () => {
    const { handler } = buildHarness([
      entry('yTOPUP', { purpose: 'topUp', identityId: 'identity1', assetLockTxid: 'c'.repeat(64) }),
      entry('yLEGACY', { purpose: undefined })
    ])

    const { addresses } = await handler.handle(event({}))

    const topUp = addresses.find(address => address.address === 'yTOPUP')
    const legacy = addresses.find(address => address.address === 'yLEGACY')

    expect(topUp?.purpose).toBe('topUp')
    expect(topUp?.identityId).toBe('identity1')
    expect(topUp?.assetLockTxid).toBe('c'.repeat(64))
    // Entries written before `purpose` existed are registration ones.
    expect(legacy?.purpose).toBe('registration')
    expect(legacy?.assetLockTxid).toBeNull()
  })

  it('reads only the scoped wallet and network', async () => {
    const { handler, storage } = buildHarness([entry('yMINE')])

    storage.cache.assetLockFundingAddresses_testnet_wallet2 = { yOTHERS: entry('yOTHERS') }
    storage.cache.assetLockFundingAddresses_mainnet_wallet1 = { yMAINNET: entry('yMAINNET') }

    const { addresses } = await handler.handle(event({}))

    expect(addresses.map(address => address.address)).toEqual(['yMINE'])
  })

  it('falls back to the current wallet when no scope is given', async () => {
    const { handler, walletRepository } = buildHarness([entry('yMINE')])

    const { addresses } = await handler.handle({
      context: 'dash-platform-extension',
      id: 'request-id',
      type: 'request',
      method: MessagingMethods.LIST_ASSET_LOCK_FUNDING_ADDRESSES,
      payload: {}
    })

    expect(walletRepository.getCurrent).toHaveBeenCalled()
    expect(addresses.map(address => address.address)).toEqual(['yMINE'])
  })

  // An explorer that cannot answer must fail the listing rather than report zero:
  // a zero is what the screen uses to say an address holds nothing.
  it('propagates an explorer failure', async () => {
    const { handler, coreExplorer } = buildHarness([entry('yADDR')])

    coreExplorer.getAddressUtxos.mockRejectedValueOnce(new Error('explorer unavailable'))

    await expect(handler.handle(event({ withBalances: true }))).rejects.toThrow(/explorer unavailable/)
  })

  describe('validatePayload', () => {
    const validate = (payload: any): string | null =>
      new ListAssetLockFundingAddressesHandler({} as any, {} as any, {} as any).validatePayload(payload)

    it('accepts an empty payload and either flag value', () => {
      expect(validate({})).toBeNull()
      expect(validate({ withBalances: true })).toBeNull()
      expect(validate({ withBalances: false })).toBeNull()
    })

    it('rejects a non-boolean flag', () => {
      expect(validate({ withBalances: 'yes' })).toMatch(/withBalances/)
    })

    it('takes the scope pair together or not at all', () => {
      expect(validate({ network: 'testnet', walletId: 'wallet1' })).toBeNull()
      expect(validate({ network: 'testnet' })).toMatch(/together/)
    })
  })
})
