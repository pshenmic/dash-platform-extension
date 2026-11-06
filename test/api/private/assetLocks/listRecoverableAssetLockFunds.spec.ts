import { ListRecoverableAssetLockFundsHandler } from '../../../../src/content-script/api/private/assetLocks/listRecoverableAssetLockFunds'
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

interface ListHarness {
  handler: ListRecoverableAssetLockFundsHandler
  storage: TestStorageAdapter
  coreExplorer: { getAddressUtxos: jest.Mock }
  walletRepository: { getCurrent: jest.Mock }
}

const buildHarness = (
  entries: AssetLockFundingAddressSchema[],
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

  const handler = new ListRecoverableAssetLockFundsHandler(
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
  method: MessagingMethods.LIST_RECOVERABLE_ASSET_LOCK_FUNDS,
  payload: { ...SCOPE, ...payload }
})

const utxo = (amount: bigint, vout = 0): any => ({ txid: `${vout}`.padStart(64, '0'), vout, amount })

describe('ListRecoverableAssetLockFundsHandler', () => {
  it('reads storage only when balances are not asked for', async () => {
    const { handler, coreExplorer } = buildHarness([entry('yADDR1'), entry('yADDR2')])

    const { addresses } = await handler.handle(event({}))

    expect(coreExplorer.getAddressUtxos).not.toHaveBeenCalled()
    expect(addresses).toHaveLength(2)
    expect(addresses[0].balanceDuffs).toBeNull()
    expect(addresses[0].utxoCount).toBeNull()
  })

  it('sums every unspent output when balances are asked for', async () => {
    const { handler, coreExplorer } = buildHarness(
      [entry('yADDR1'), entry('yADDR2')],
      { yADDR1: [utxo(60_000n), utxo(40_000n, 1)], yADDR2: [] }
    )

    const { addresses } = await handler.handle(event({ withBalances: true }))

    expect(coreExplorer.getAddressUtxos).toHaveBeenCalledTimes(2)

    const first = addresses.find(address => address.address === 'yADDR1')
    const second = addresses.find(address => address.address === 'yADDR2')

    expect(first?.balanceDuffs).toBe('100000')
    expect(first?.utxoCount).toBe(2)
    expect(second?.balanceDuffs).toBe('0')
    expect(second?.utxoCount).toBe(0)
  })

  // These are the entries the whole feature exists for: a registration that
  // stopped before its asset lock, so nothing local records the deposit and only
  // the chain can say the money is there.
  it('lists a legacy entry with no purpose and no recorded payment', async () => {
    const { handler } = buildHarness([entry('yLEGACY', { purpose: undefined })], { yLEGACY: [utxo(250_000n)] })

    const { addresses } = await handler.handle(event({ withBalances: true }))

    expect(addresses).toHaveLength(1)
    expect(addresses[0].purpose).toBe('registration')
    expect(addresses[0].balanceDuffs).toBe('250000')
  })

  it('reports an entry with no stored key as one that cannot be spent', async () => {
    const { handler } = buildHarness([
      entry('yHASKEY'),
      entry('yNOKEY', { encryptedPrivateKey: '' })
    ])

    const { addresses } = await handler.handle(event({}))

    expect(addresses.find(address => address.address === 'yHASKEY')?.hasKey).toBe(true)
    expect(addresses.find(address => address.address === 'yNOKEY')?.hasKey).toBe(false)
  })

  it('carries through who the address was reserved for', async () => {
    const { handler } = buildHarness([
      entry('yTOPUP', { purpose: 'topUp', identityId: 'identity1' }),
      entry('ySHIELD', { purpose: 'shield', recipient: 'own' })
    ])

    const { addresses } = await handler.handle(event({}))

    const topUp = addresses.find(address => address.address === 'yTOPUP')
    const shield = addresses.find(address => address.address === 'ySHIELD')

    expect(topUp?.purpose).toBe('topUp')
    expect(topUp?.identityId).toBe('identity1')
    expect(shield?.purpose).toBe('shield')
    expect(shield?.recipient).toBe('own')
  })

  describe('what it leaves out', () => {
    it('omits spent addresses, committed asset locks and other purposes alike', async () => {
      const { handler } = buildHarness([
        entry('ySPENDABLE'),
        entry('yUSED', { used: true }),
        // Its deposit is an asset lock's input: still not `used`, but not free.
        entry('yCOMMITTED', { assetLockTxid: 'a'.repeat(64) })
      ])

      const { addresses } = await handler.handle(event({}))

      expect(addresses.map(address => address.address)).toEqual(['ySPENDABLE'])
    })

    it('omits another wallet and another network', async () => {
      const { handler, storage } = buildHarness([entry('yMINE')])

      storage.cache.assetLockFundingAddresses_testnet_wallet2 = {
        yOTHERS: entry('yOTHERS')
      }
      storage.cache.assetLockFundingAddresses_mainnet_wallet1 = {
        yMAINNET: entry('yMAINNET')
      }

      const { addresses } = await handler.handle(event({}))

      expect(addresses.map(address => address.address)).toEqual(['yMINE'])
    })
  })

  it('falls back to the current wallet when no scope is given', async () => {
    const { handler, walletRepository } = buildHarness([entry('yMINE')])

    const { addresses } = await handler.handle({
      context: 'dash-platform-extension',
      id: 'request-id',
      type: 'request',
      method: MessagingMethods.LIST_RECOVERABLE_ASSET_LOCK_FUNDS,
      payload: {}
    })

    expect(walletRepository.getCurrent).toHaveBeenCalled()
    expect(addresses.map(address => address.address)).toEqual(['yMINE'])
  })

  describe('validatePayload', () => {
    const validate = (payload: any): string | null =>
      new ListRecoverableAssetLockFundsHandler({} as any, {} as any, {} as any).validatePayload(payload)

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
