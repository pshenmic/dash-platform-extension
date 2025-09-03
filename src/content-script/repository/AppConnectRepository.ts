import { AppConnect } from '../../types'
import { StorageAdapter } from '../storage/storageAdapter'
import { AppConnectsStorageSchema } from '../storage/storageSchema'
import { AppConnectStatus } from '../../types/enums/AppConnectStatus'
import hash from 'hash.js'

export class AppConnectRepository {
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  async create (url: string): Promise<AppConnect> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null
    const id = hash.sha256().update(url).digest('hex').substring(0, 6)

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `appConnects_${network}_${walletId}`

    const appConnectRequest: AppConnect = {
      id,
      status: AppConnectStatus.pending,
      url
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
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `appConnects_${network}_${walletId}`

    const id = hash.sha256().update(url).digest('hex').substring(0, 6)

    const appConnects = (await this.storageAdapter.get(storageKey) ?? {}) as AppConnectsStorageSchema

    if (appConnects[id] == null) {
      return null
    }

    return {
      ...appConnects[id],
      status: AppConnectStatus[appConnects[id].status]
    }
  }

  async getAll (): Promise<AppConnect[]> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `appConnects_${network}_${walletId}`

    const appConnects = (await this.storageAdapter.get(storageKey) ?? {}) as AppConnectsStorageSchema

    return Object.entries(appConnects)
      .reduce((acc, [id, entry]) =>
        ([...acc,
          {
            id,
            url: entry.url,
            status: AppConnectStatus[entry.status]
          }
        ]),
      [])
  }

  async removeById (id: string): Promise<void> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `appConnects_${network}_${walletId}`

    const appConnects = (await this.storageAdapter.get(storageKey) ?? {}) as AppConnectsStorageSchema

    if (appConnects[id] == null) {
      throw new Error(`Could not find AppConnect with id ${id}`)
    }

    // eslint-disable-next-line
    delete appConnects[id]

    await this.storageAdapter.set(storageKey, appConnects)
  }

  async getById (id: string): Promise<AppConnect | null> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `appConnects_${network}_${walletId}`

    const appConnects = (await this.storageAdapter.get(storageKey) ?? {}) as AppConnectsStorageSchema

    if (appConnects[id] == null) {
      return null
    }

    return {
      ...appConnects[id],
      status: AppConnectStatus[appConnects[id].status]
    }
  }
}
