import { StorageAdapter } from '../storage/storageAdapter'
import { RepositoryScope } from '../../types/RepositoryScope'
import { IdentityFundingOperation } from '../../types/IdentityFundingOperation'

const FINISHED_STATUSES: Array<IdentityFundingOperation['status']> = ['completed', 'cancelled', 'failed']

// A pending operation still holds its funds: coins, a Platform nonce or notes.
export const isPendingFundingOperation = (operation: IdentityFundingOperation): boolean => {
  return !FINISHED_STATUSES.includes(operation.status)
}

export class IdentityFundingRepository {
  constructor (public storageAdapter: StorageAdapter, public scope: RepositoryScope) {}

  async getAll (): Promise<IdentityFundingOperation[]> {
    return Object.values(await this.storageAdapter.get(this.storageKey()) ?? {}) as IdentityFundingOperation[]
  }

  async get (id: string): Promise<IdentityFundingOperation | undefined> {
    return (await this.getAll()).find(operation => operation.id === id)
  }

  // Call under withLock: storage adapters have no atomic compare-and-swap.
  async save (operation: IdentityFundingOperation): Promise<void> {
    if (operation.network !== this.scope.network || operation.walletId !== this.scope.walletId) throw new Error('Funding operation scope mismatch')
    const entries = await this.getAll()
    await this.storageAdapter.set(this.storageKey(), Object.fromEntries([
      ...entries.map(entry => [entry.id, entry]), [operation.id, operation]
    ]))
  }

  async withLock<T> (callback: () => Promise<T>): Promise<T> {
    // Web Locks coordinate all extension documents, including old popup API
    // hosts. A lock is released on document termination; the journal survives.
    if (typeof navigator === 'undefined' || navigator.locks == null) throw new Error('Wallet funding requires Web Locks support')
    return await navigator.locks.request(this.storageKey(), callback)
  }

  // Held for a whole execute of one operation, so two documents never drive the
  // same operation at once. The journal lock above stays short: a long wait here
  // must not hold up other operations or spends of this wallet.
  async withOperationLock<T> (id: string, callback: () => Promise<T>): Promise<T> {
    if (typeof navigator === 'undefined' || navigator.locks == null) {
      throw new Error('Wallet funding requires Web Locks support')
    }

    return await navigator.locks.request(`${this.storageKey()}:${id}`, callback)
  }

  private storageKey (): string {
    return `identityFunding_${this.scope.network}_${this.scope.walletId}`
  }
}
