import {StorageAdapter} from "../storage/storageAdapter";
import {Identity} from "../../types/Identity";
import {IdentityPublicKeyWASM, DashPlatformProtocolWASM} from 'pshenmic-dpp'
import {IdentitiesStoreSchema, IdentityStoreSchema} from "../storage/storageSchema";
import {base64} from "@scure/base";

export class IdentitiesRepository {
    dpp: DashPlatformProtocolWASM
    storageKey: string
    storageAdapter: StorageAdapter

    constructor(storageAdapter: StorageAdapter, dpp: DashPlatformProtocolWASM) {
        this.dpp = dpp
        this.storageAdapter = storageAdapter
    }

    async create(index: number, identifier: string, identityPublicKeys: IdentityPublicKeyWASM[]): Promise<Identity> {
        const network = await this.storageAdapter.get('network')
        const walletId = await this.storageAdapter.get('currentWalletId')


        const storageKey = `identities_${network}_${walletId}`

        const identities = await this.storageAdapter.get(storageKey) as IdentitiesStoreSchema || {}

        const identityStoreSchema: IdentityStoreSchema = {
            index,
            label: null,
            identifier,
            identityPublicKeys: identityPublicKeys.map(identityPublicKey => base64.encode(identityPublicKey.toBytes()))
        }

        identities[identifier] = identityStoreSchema

        await this.storageAdapter.set(storageKey, identities)

        // Set as current identity if it's the first one
        const currentIdentityKey = `identities_${network}_${walletId}_currentIdentity`
        const currentIdentityData = await this.storageAdapter.get(currentIdentityKey) as any
        
        if (!currentIdentityData || !currentIdentityData.currentIdentity) {
            await this.storageAdapter.set(currentIdentityKey, { currentIdentity: identifier })
        }

        return {
            identifier: identityStoreSchema.identifier,
            identityPublicKeys,
            index: identityStoreSchema.index,
            label: identityStoreSchema.label
        }
    }

    async getAll(): Promise<Identity[]> {
        const network = await this.storageAdapter.get('network')
        const walletId = await this.storageAdapter.get('currentWalletId')

        const storageKey = `identities_${network}_${walletId}`

        const identities = await this.storageAdapter.get(storageKey) as IdentitiesStoreSchema

        if (!identities || !Object.keys(identities).length) {
            return []
        }

        return Object.entries(identities)
            .map(([identifier, entry]) =>
                ({
                        identifier,
                        identityPublicKeys: entry.identityPublicKeys.map((identityPublicKey) =>
                            this.dpp.IdentityPublicKeyWASM.fromBytes(base64.decode(identityPublicKey))),
                        index: entry.index,
                        label: entry.label
                    }
                )
            )
    }


    async getByIdentifier(identifier: string): Promise<Identity> {
        const network = await this.storageAdapter.get('network')
        const walletId = await this.storageAdapter.get('currentWalletId')
        
        const storageKey = `identities_${network}_${walletId}`
        
        const identities = await this.storageAdapter.get(storageKey) as IdentitiesStoreSchema || {}

        if (!identities[identifier]) {
            return null
        }

        const entry = identities[identifier]
        return {
            identifier: entry.identifier,
            identityPublicKeys: entry.identityPublicKeys.map((identityPublicKey) =>
                this.dpp.IdentityPublicKeyWASM.fromBytes(base64.decode(identityPublicKey))),
            index: entry.index,
            label: entry.label
        }
    }

    async getCurrentIdentity(): Promise<Identity> {
        const network = await this.storageAdapter.get('network')
        const walletId = await this.storageAdapter.get('currentWalletId')
        
        const storageKey = `identities_${network}_${walletId}_currentIdentity`
        const entry = await this.storageAdapter.get(storageKey) as any

        const currentIdentity = entry?.['currentIdentity']

        if (!currentIdentity) {
            return null
        }

        return this.getByIdentifier(currentIdentity)
    }

    async setCurrentIdentity(identifier: string): Promise<void> {
        const network = await this.storageAdapter.get('network')
        const walletId = await this.storageAdapter.get('currentWalletId')
        
        const storageKey = `identities_${network}_${walletId}_currentIdentity`
        
        await this.storageAdapter.set(storageKey, { currentIdentity: identifier })
    }
}
