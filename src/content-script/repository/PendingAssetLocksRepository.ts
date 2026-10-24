import { PendingAssetLockSchema, PendingAssetLocksSchema } from '../storage/storageSchema'
import { StorageAdapter } from '../storage/storageAdapter'
import { RepositoryScope } from '../../types/RepositoryScope'

/**
 * Asset locks that are on L1 but whose Platform side has not finished.
 *
 * An entry is written before the asset lock can reach the network and removed
 * when the operation completes, so whatever is left here is money committed on
 * L1 that nothing has claimed yet. Pure storage: who writes and when is the
 * handlers' business.
 */
export class PendingAssetLocksRepository {
  storageAdapter: StorageAdapter
  scope?: RepositoryScope

  constructor (storageAdapter: StorageAdapter, scope?: RepositoryScope) {
    this.storageAdapter = storageAdapter
    this.scope = scope
  }

  forScope (scope: RepositoryScope): PendingAssetLocksRepository {
    return new PendingAssetLocksRepository(this.storageAdapter, scope)
  }

  async create (entry: PendingAssetLockSchema): Promise<void> {
    const storageKey = await this.getStorageKey()
    const pending = (await this.storageAdapter.get(storageKey) ?? {}) as PendingAssetLocksSchema

    pending[entry.assetLockTxid] = entry

    await this.storageAdapter.set(storageKey, pending)
  }

  async getAll (): Promise<PendingAssetLockSchema[]> {
    const storageKey = await this.getStorageKey()
    const pending = (await this.storageAdapter.get(storageKey) ?? {}) as PendingAssetLocksSchema

    return Object.values(pending)
  }

  async remove (assetLockTxid: string): Promise<void> {
    const storageKey = await this.getStorageKey()
    const pending = (await this.storageAdapter.get(storageKey) ?? {}) as PendingAssetLocksSchema

    if (pending[assetLockTxid] == null) {
      return
    }

    const { [assetLockTxid]: _removed, ...rest } = pending

    await this.storageAdapter.set(storageKey, rest)
  }

  private async getStorageKey (): Promise<string> {
    if (this.scope != null) {
      return `pendingAssetLocks_${this.scope.network}_${this.scope.walletId}`
    }

    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    return `pendingAssetLocks_${network}_${walletId}`
  }
}
