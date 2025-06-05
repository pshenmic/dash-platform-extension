import {StorageAdapter} from "../storage/storageAdapter";

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
    storageKey: string
    storageAdapter: StorageAdapter

    constructor(walletId: string, network: string, storageAdapter: StorageAdapter) {
        this.walletId = walletId
        this.network = network
        this.storageKey = `${network}_${walletId}_identities`
        this.storageAdapter = storageAdapter
    }

    async getAll(): Promise<Identity[]> {
        const identities = await this.storageAdapter.get(this.storageKey)

        return Object.entries(identities).map(([identifier, entry]) => {
                return {
                    identifier: identifier as string,
                    privateKeys: (entry as IdentityStorageEntry).privateKeys
                } as Identity
            }
        )
    }

    async getByIdentifier(identifier: string): Promise<Identity> {
        const identities = await this.storageAdapter.get(this.storageKey)

        if (!identities[identifier]) {
            throw new Error(`Could not find identity with identifier ${identifier}`)
        }

        return identities[identifier]
    }

    async getCurrentIdentity(): Promise<Identity> {
        const entry = await this.storageAdapter.get(`${this.storageKey}_currentIdentity`)

        const currentIdentity = entry['currentIdentity']

        if (!currentIdentity) {
            throw new Error(`No current identity is set yet`)
        }

        return this.getByIdentifier(currentIdentity)
    }
}
