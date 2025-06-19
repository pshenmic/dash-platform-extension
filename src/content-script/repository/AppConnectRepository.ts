import { AppConnect } from '../../types/AppConnect'
import { StorageAdapter } from '../storage/storageAdapter'

export class AppConnectRepository {
  storageKey: string
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  async create (url: string): Promise<AppConnect> {
    const network = await this.storageAdapter.get('network')
    const walletId = await this.storageAdapter.get('currentWalletId')

    const storageKey = `appConnects_${network}_${walletId}`

    const appConnectRequest: AppConnect = {
      id: new Date().getTime() + '',
      status: 'pending',
      url
    }

    const appConnects = await this.storageAdapter.get(storageKey)

    if (appConnects[appConnectRequest.id]) {
      throw new Error('AppConnect with such id already exists')
    }

    appConnects[appConnectRequest.id] = appConnectRequest

    await this.storageAdapter.set(storageKey, appConnects)

    return appConnectRequest
  }

  async get (id: string): Promise<AppConnect | null> {
    const network = await this.storageAdapter.get('network')
    const walletId = await this.storageAdapter.get('currentWalletId')

    const storageKey = `appConnects_${network}_${walletId}`

    const appConnects = await this.storageAdapter.get(storageKey)

    if (appConnects[id]) {
      return null
    }

    return appConnects[id]
  }
}
