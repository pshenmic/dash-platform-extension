import { StorageAdapter } from '../../src/content-script/storage/storageAdapter'
import { AssetLockFundingAddressesRepository } from '../../src/content-script/repository/AssetLockFundingAddressesRepository'
import { IdentitiesRepository } from '../../src/content-script/repository/IdentitiesRepository'
import { WalletRepository } from '../../src/content-script/repository/WalletRepository'
import { RepositoryScope } from '../../src/types/RepositoryScope'
import { IdentityType } from '../../src/types/enums/IdentityType'
import { WalletType } from '../../src/types/WalletType'

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

const SCOPE: RepositoryScope = { network: 'testnet', walletId: 'wallet1' }

describe('repository scope', () => {
  let storage: TestStorageAdapter
  let sdk: any

  beforeEach(() => {
    storage = new TestStorageAdapter()
    sdk = {}

    // The extension's current selection points somewhere else entirely, so any
    // read that falls back to it addresses the wrong store.
    storage.cache.network = 'mainnet'
    storage.cache.currentWalletId = 'wallet2'
  })

  describe('AssetLockFundingAddressesRepository', () => {
    const entry = { address: 'yFunding', encryptedPrivateKey: 'encrypted', used: false, index: 0, purpose: 'topUp' as const }

    test('writes and reads under the scoped key, not the current selection', async () => {
      const repository = new AssetLockFundingAddressesRepository(storage).forScope(SCOPE)

      await repository.create(entry)

      expect(storage.cache[`assetLockFundingAddresses_${SCOPE.network}_${SCOPE.walletId}`]).toEqual({ yFunding: entry })
      expect(storage.cache.assetLockFundingAddresses_mainnet_wallet2).toBeUndefined()
      expect(await repository.getByAddress('yFunding')).toEqual(entry)
    })

    test('keeps addressing the same store after the current selection changes', async () => {
      const repository = new AssetLockFundingAddressesRepository(storage).forScope(SCOPE)

      await repository.create(entry)

      storage.cache.network = 'testnet'
      storage.cache.currentWalletId = 'wallet3'

      await repository.markAsBroadcasted('yFunding', 'a'.repeat(64))
      await repository.markAsUsed('yFunding')

      const stored = storage.cache[`assetLockFundingAddresses_${SCOPE.network}_${SCOPE.walletId}`]

      expect(stored.yFunding).toEqual({ ...entry, assetLockTxid: 'a'.repeat(64), registrationIdentityIndex: undefined, used: true })
      expect(storage.cache.assetLockFundingAddresses_testnet_wallet3).toBeUndefined()
    })

    test('falls back to the current selection when unscoped', async () => {
      const repository = new AssetLockFundingAddressesRepository(storage)

      await repository.create(entry)

      expect(storage.cache.assetLockFundingAddresses_mainnet_wallet2).toEqual({ yFunding: entry })
    })
  })

  describe('IdentitiesRepository', () => {
    test('writes and reads under the scoped key, not the current selection', async () => {
      const repository = new IdentitiesRepository(storage, sdk).forScope(SCOPE)

      await repository.create('identity1', IdentityType.regular, 0)

      expect(storage.cache[`identities_${SCOPE.network}_${SCOPE.walletId}`]).toBeDefined()
      expect(storage.cache.identities_mainnet_wallet2).toBeUndefined()
      expect(await repository.getByIdentifier('identity1')).toMatchObject({ identifier: 'identity1', index: 0 })
    })

    test('does not see identities of the currently selected wallet', async () => {
      const unscoped = new IdentitiesRepository(storage, sdk)
      await unscoped.create('identity2', IdentityType.regular, 0)

      const repository = new IdentitiesRepository(storage, sdk).forScope(SCOPE)

      expect(await repository.getByIdentifier('identity2')).toBeNull()
      expect(await repository.getAll()).toEqual([])
    })
  })

  describe('WalletRepository', () => {
    const walletSchema = {
      walletId: SCOPE.walletId,
      type: WalletType.seedphrase,
      network: SCOPE.network,
      label: null,
      encryptedMnemonic: 'encryptedMnemonic',
      seedHash: 'seedHash',
      currentIdentity: null
    }

    test('getCurrent resolves the scoped wallet rather than the selected one', async () => {
      storage.cache[`wallet_${SCOPE.network}_${SCOPE.walletId}`] = walletSchema
      storage.cache.wallet_mainnet_wallet2 = { ...walletSchema, walletId: 'wallet2', network: 'mainnet' }

      const repository = new WalletRepository(storage, new IdentitiesRepository(storage, sdk)).forScope(SCOPE)

      expect(await repository.getCurrent()).toMatchObject({ walletId: SCOPE.walletId, network: SCOPE.network })
    })

    test('getById looks the wallet up on the scoped network', async () => {
      storage.cache[`wallet_${SCOPE.network}_${SCOPE.walletId}`] = walletSchema

      const repository = new WalletRepository(storage, new IdentitiesRepository(storage, sdk)).forScope(SCOPE)

      expect(await repository.getById(SCOPE.walletId)).toMatchObject({ walletId: SCOPE.walletId })
      expect(await new WalletRepository(storage, new IdentitiesRepository(storage, sdk)).getById(SCOPE.walletId)).toBeNull()
    })

    test('carries the scope into the identities repository it owns', async () => {
      storage.cache[`wallet_${SCOPE.network}_${SCOPE.walletId}`] = walletSchema

      const repository = new WalletRepository(storage, new IdentitiesRepository(storage, sdk)).forScope(SCOPE)

      await repository.identitiesRepository.create('identity1', IdentityType.regular, 0)
      await repository.switchIdentity('identity1')

      expect(storage.cache[`identities_${SCOPE.network}_${SCOPE.walletId}`]).toBeDefined()
      expect(storage.cache[`wallet_${SCOPE.network}_${SCOPE.walletId}`].currentIdentity).toBe('identity1')
    })
  })
})
