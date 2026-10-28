import { AppConnect } from '../../types'
import { StorageAdapter } from '../storage/storageAdapter'
import { AppConnectsStorageSchema } from '../storage/storageSchema'
import { AppConnectStatus } from '../../types/enums/AppConnectStatus'
import { RepositoryScope } from '../../types/RepositoryScope'
import hash from 'hash.js'

export class AppConnectRepository {
  storageAdapter: StorageAdapter
  scope?: RepositoryScope

  constructor (storageAdapter: StorageAdapter, scope?: RepositoryScope) {
    this.storageAdapter = storageAdapter
    this.scope = scope
  }

  // Returns a repository pinned to one (network, wallet) pair instead of
  // re-reading the current one on every call. A caller that already knows the
  // pair uses this, so a switch halfway through cannot repoint its reads.
  forScope (scope: RepositoryScope): AppConnectRepository {
    return new AppConnectRepository(this.storageAdapter, scope)
  }

  private async getStorageKey (): Promise<string> {
    if (this.scope != null) {
      return `appConnects_${this.scope.network}_${this.scope.walletId}`
    }

    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    return `appConnects_${network}_${walletId}`
  }

  async create (url: string): Promise<AppConnect> {
    const storageKey = await this.getStorageKey()
    const id = hash.sha256().update(url).digest('hex').substring(0, 6)

    const appConnectRequest: AppConnect = {
      id,
      status: AppConnectStatus.pending,
      url,
      identities: []
    }

    const appConnects = (await this.storageAdapter.get(storageKey) ?? {}) as AppConnectsStorageSchema

    if (appConnects[appConnectRequest.id] != null) {
      throw new Error('AppConnect with such id already exists')
    }

    appConnects[appConnectRequest.id] = appConnectRequest

    await this.storageAdapter.set(storageKey, appConnects)

    return appConnectRequest
  }

  async getByURL (url: string): Promise<AppConnect | null> {
    const storageKey = await this.getStorageKey()

    const id = hash.sha256().update(url).digest('hex').substring(0, 6)

    const appConnects = (await this.storageAdapter.get(storageKey) ?? {}) as AppConnectsStorageSchema

    if (appConnects[id] == null) {
      return null
    }

    return {
      ...appConnects[id],
      status: AppConnectStatus[appConnects[id].status],
      identities: appConnects[id].identities ?? []
    }
  }

  async getAll (): Promise<AppConnect[]> {
    const storageKey = await this.getStorageKey()

    const appConnects = (await this.storageAdapter.get(storageKey) ?? {}) as AppConnectsStorageSchema

    return Object.entries(appConnects)
      .reduce((acc, [id, entry]) =>
        ([...acc,
          {
            id,
            url: entry.url,
            status: AppConnectStatus[entry.status],
            identities: entry.identities ?? []
          }
        ]),
      [])
  }

  async removeById (id: string): Promise<void> {
    const storageKey = await this.getStorageKey()

    const appConnects = (await this.storageAdapter.get(storageKey) ?? {}) as AppConnectsStorageSchema

    if (appConnects[id] == null) {
      throw new Error(`Could not find AppConnect with id ${id}`)
    }

    // eslint-disable-next-line
    delete appConnects[id]

    await this.storageAdapter.set(storageKey, appConnects)
  }

  async getById (id: string): Promise<AppConnect | null> {
    const storageKey = await this.getStorageKey()

    const appConnects = (await this.storageAdapter.get(storageKey) ?? {}) as AppConnectsStorageSchema

    if (appConnects[id] == null) {
      return null
    }

    return {
      ...appConnects[id],
      status: AppConnectStatus[appConnects[id].status],
      identities: appConnects[id].identities ?? []
    }
  }

  // Identities this website may see. Replaces the whole grant, so revoking is
  // the same call with a shorter list.
  async setIdentities (id: string, identities: string[]): Promise<void> {
    const storageKey = await this.getStorageKey()

    const appConnects = (await this.storageAdapter.get(storageKey) ?? {}) as AppConnectsStorageSchema

    if (appConnects[id] == null) {
      throw new Error(`Could not find AppConnect with id ${id}`)
    }

    appConnects[id].identities = identities

    await this.storageAdapter.set(storageKey, appConnects)
  }

  async setStatus (id: string, status: AppConnectStatus): Promise<void> {
    const storageKey = await this.getStorageKey()

    const appConnects = (await this.storageAdapter.get(storageKey) ?? {}) as AppConnectsStorageSchema

    if (appConnects[id] == null) {
      throw new Error(`Could not find AppConnect with id ${id}`)
    }

    appConnects[id].status = status

    await this.storageAdapter.set(storageKey, appConnects)
  }
}
