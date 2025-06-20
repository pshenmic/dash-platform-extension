import { AppConnect } from '../../types/AppConnect'
import { StorageAdapter } from '../storage/storageAdapter'
import { AppConnectsStorageSchema } from '../storage/storageSchema'
import { AppConnectStatus } from '../../types/enums/AppConnectStatus'
import { generateRandomHex } from '../../utils'

export class AppConnectRepository {
  storageKey: string
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  async create (url: string): Promise<AppConnect> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `appConnects_${network}_${walletId}`

    const appConnectRequest: AppConnect = {
      id: generateRandomHex(6),
      status: 'pending',
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

  async get (id: string): Promise<AppConnect | null> {
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
