import { StorageAdapter } from '../../src/content-script/storage/storageAdapter'
import { CorePendingSpendsRepository } from '../../src/content-script/repository/CorePendingSpendsRepository'
import { CorePendingSpendSchema } from '../../src/content-script/storage/storageSchema'

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

const entry = (txid: string): CorePendingSpendSchema => ({
  txid,
  spentOutpoints: [`${txid}:0`],
  broadcastedAt: 1_700_000_000_000
})

describe('CorePendingSpendsRepository', () => {
  let storage: TestStorageAdapter
  let repository: CorePendingSpendsRepository

  beforeEach(() => {
    storage = new TestStorageAdapter()
    storage.cache.network = 'testnet'
    storage.cache.currentWalletId = 'wallet1'

    repository = new CorePendingSpendsRepository(storage)
  })

  it('has nothing pending for a wallet that has never sent', async () => {
    expect(await repository.getAll()).toEqual([])
  })

  it('stores entries under the current wallet and network', async () => {
    await repository.record(entry('aa'))

    expect(storage.cache.corePendingSpends_testnet_wallet1).toEqual({ aa: entry('aa') })
    expect(await repository.getAll()).toEqual([entry('aa')])
  })

  it('keeps the entries of other wallets out of the way', async () => {
    await repository.record(entry('aa'))

    storage.cache.currentWalletId = 'wallet2'

    expect(await repository.getAll()).toEqual([])
  })

  it('re-recording the same transaction replaces it rather than duplicating', async () => {
    await repository.record(entry('aa'))
    await repository.record({ ...entry('aa'), broadcastedAt: 1_700_000_100_000 })

    const all = await repository.getAll()

    expect(all).toHaveLength(1)
    expect(all[0].broadcastedAt).toBe(1_700_000_100_000)
  })

  it('removes the entries it is given and leaves the rest', async () => {
    await repository.record(entry('aa'))
    await repository.record(entry('bb'))

    await repository.remove(['aa'])

    expect((await repository.getAll()).map(pending => pending.txid)).toEqual(['bb'])
  })

  it('does not touch storage when there is nothing to remove', async () => {
    await repository.remove([])

    expect(storage.cache.corePendingSpends_testnet_wallet1).toBeUndefined()
  })

  it('refuses to answer when no wallet is chosen', async () => {
    storage.cache.currentWalletId = null

    await expect(repository.getAll()).rejects.toThrow('Wallet is not chosen')
  })
})
