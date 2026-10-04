import { StorageAdapter } from '../storage/storageAdapter'
import { RepositoryScope } from '../../types/RepositoryScope'
import { ShieldedNotesAccount, ShieldedNotesStore } from '../../types/ShieldedNotes'

// Stores what the last shielded sync recovered, per wallet and account. Pure
// storage: it never talks to the pool and never derives anything, so reading it
// needs no password.
export class ShieldedNotesRepository {
  storageAdapter: StorageAdapter
  scope?: RepositoryScope

  constructor (storageAdapter: StorageAdapter, scope?: RepositoryScope) {
    this.storageAdapter = storageAdapter
    this.scope = scope
  }

  // Returns a repository pinned to one (network, wallet) pair. A sync walks every
  // wallet, so it addresses each one through its own scope instead of the shared
  // instance, which re-reads the selected wallet on every call.
  forScope (scope: RepositoryScope): ShieldedNotesRepository {
    return new ShieldedNotesRepository(this.storageAdapter, scope)
  }

  async get (account: number): Promise<ShieldedNotesAccount | null> {
    const accounts = await this.getAll()

    return accounts[String(account)] ?? null
  }

  async getAll (): Promise<ShieldedNotesStore> {
    const storageKey = await this.getStorageKey()

    return (await this.storageAdapter.get(storageKey) ?? {}) as ShieldedNotesStore
  }

  async save (entry: ShieldedNotesAccount): Promise<void> {
    const storageKey = await this.getStorageKey()
    const accounts = (await this.storageAdapter.get(storageKey) ?? {}) as ShieldedNotesStore

    accounts[String(entry.account)] = entry

    await this.storageAdapter.set(storageKey, accounts)
  }

  // Drops everything stored for the wallet. Used when the pool no longer matches
  // what was scanned, so the next sync starts from an empty tree.
  async clear (): Promise<void> {
    await this.storageAdapter.set(await this.getStorageKey(), {})
  }

  // Serializes syncs of one wallet against each other. The backend runs in a
  // single offscreen document, but the popup and a background refresh can ask
  // for the same wallet at once, and both would rescan the same pool notes.
  async withLock<T> (callback: () => Promise<T>): Promise<T> {
    const storageKey = await this.getStorageKey()

    if (typeof navigator === 'undefined' || navigator.locks == null) {
      throw new Error('Shielded sync requires Web Locks support')
    }

    return await navigator.locks.request(storageKey, async () => await callback())
  }

  private async getStorageKey (): Promise<string> {
    if (this.scope != null) {
      return `shieldedNotes_${this.scope.network}_${this.scope.walletId}`
    }

    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('No wallet is chosen')
    }

    return `shieldedNotes_${network}_${walletId}`
  }
}
