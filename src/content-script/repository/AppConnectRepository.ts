import {AppConnect} from "../../types/AppConnect";

const CHROME_STORAGE_KEY = 'appConnects'

export class AppConnectRepository {
    walletId: string
    network: string

    constructor(walletId: string, network: string) {
        this.walletId = walletId
        this.network = network
    }

    async create(url: string): Promise<AppConnect> {
        const appConnectRequest: AppConnect = {
            id: new Date().getTime() + '',
            status: 'pending',
            url
        }

        const {appConnects} = await chrome.storage.local.get([CHROME_STORAGE_KEY])

        if ((appConnects ?? {})[appConnectRequest.id]) {
            throw new Error('AppConnect with such id already exists')
        }

        appConnects[appConnectRequest.id] = appConnectRequest

        await chrome.storage.local.set({appConnects})

        return appConnectRequest
    }

    async get(id: string) : Promise<AppConnect>{
        const {appConnects} = await chrome.storage.local.get([CHROME_STORAGE_KEY])

        if (!(appConnects ?? {})[id]) {
            throw new Error(`AppConnect with request ${id} does not exist`)
        }

        return appConnects[id]
    }
}
