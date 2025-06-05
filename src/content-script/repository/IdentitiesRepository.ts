const CHROME_STORAGE_KEY = 'identities'

export interface Identity {
    identifier: string
    privateKeys: string[]
}

export interface IdentityStorageEntry {
    privateKeys: string[]
}

export class IdentitiesRepository {
    walletId: string
    network: string

    constructor(walletId: string, network: string) {
        this.walletId = walletId
        this.network = network
    }

    async getAll(): Promise<Identity[]> {
        const {identities} = await chrome.storage.local.get([CHROME_STORAGE_KEY])

        return Object.entries(identities ?? {}).map(([identifier, entry]) => {
                return {
                    identifier: identifier as string,
                    privateKeys: (entry as IdentityStorageEntry).privateKeys
                } as Identity
            }
        )
    }

    async getByIdentifier(identifier: string): Promise<Identity> {
        const {identities} = await chrome.storage.local.get([CHROME_STORAGE_KEY])

        if (!(identities ?? {})[identifier]) {
            throw new Error(`Could not find identity with identifier ${identifier}`)
        }

        return identities[identifier]
    }
}
