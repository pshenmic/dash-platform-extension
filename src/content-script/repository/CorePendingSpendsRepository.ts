import { StorageAdapter } from '../storage/storageAdapter'
import { CorePendingSpendSchema, CorePendingSpendsSchema } from '../storage/storageSchema'

// Storage for Core (L1) transactions this wallet has broadcast but the explorer
// has not indexed yet. Pure storage: what makes an entry obsolete is decided by
// the caller, which is the only place that knows the explorer's current view.
export class CorePendingSpendsRepository {
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  async record (entry: CorePendingSpendSchema): Promise<void> {
    const storageKey = await this.getStorageKey()
    const pending = (await this.storageAdapter.get(storageKey) ?? {}) as CorePendingSpendsSchema

    pending[entry.txid] = entry

    await this.storageAdapter.set(storageKey, pending)
  }

  async getAll (): Promise<CorePendingSpendSchema[]> {
    const storageKey = await this.getStorageKey()
    const pending = (await this.storageAdapter.get(storageKey) ?? {}) as CorePendingSpendsSchema

    return Object.values(pending)
  }

  async remove (txids: string[]): Promise<void> {
    if (txids.length === 0) {
      return
    }

    const storageKey = await this.getStorageKey()
    const pending = (await this.storageAdapter.get(storageKey) ?? {}) as CorePendingSpendsSchema

    for (const txid of txids) {
      delete pending[txid] // eslint-disable-line @typescript-eslint/no-dynamic-delete
    }

    await this.storageAdapter.set(storageKey, pending)
  }

  private async getStorageKey (): Promise<string> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    return `corePendingSpends_${network}_${walletId}`
  }
}
