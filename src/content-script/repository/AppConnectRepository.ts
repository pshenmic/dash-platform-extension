import {AppConnect} from "../../types/AppConnect";
import {StorageAdapter} from "../storage/storageAdapter";

export class AppConnectRepository {
    walletId: string
    network: string
    storageKey: string
    storageAdapter: StorageAdapter

    constructor(walletId: string, network: string, storageAdapter: StorageAdapter) {
        this.walletId = walletId
        this.network = network
        this.storageKey = `${network}_${walletId}_appConnects`
        this.storageAdapter = storageAdapter
    }

    async create(url: string): Promise<AppConnect> {
        const appConnectRequest: AppConnect = {
            id: new Date().getTime() + '',
            status: 'pending',
            url
        }

        const appConnects = await this.storageAdapter.get(this.storageKey)

        if (appConnects[appConnectRequest.id]) {
            throw new Error('AppConnect with such id already exists')
        }

        appConnects[appConnectRequest.id] = appConnectRequest

        await this.storageAdapter.set(this.storageKey, appConnects)

        return appConnectRequest
    }

    async get(id: string) : Promise<AppConnect>{
        const appConnects = await this.storageAdapter.get(this.storageKey)

        if (appConnects[id]) {
            throw new Error(`AppConnect with request ${id} does not exist`)
        }

        return appConnects[id]
    }
}
