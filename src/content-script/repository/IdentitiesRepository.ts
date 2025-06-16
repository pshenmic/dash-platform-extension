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


        const storageKey = `${network}_${walletId}_identities`

        const identities = await this.storageAdapter.get(storageKey)

        const identityStoreSchema: IdentityStoreSchema = {
            index,
            label: null,
            identifier,
            identityPublicKeys: identityPublicKeys.map(identityPublicKey => base64.encode(identityPublicKey.toBytes()))
        }

        identities[identifier] = identityStoreSchema

        await this.storageAdapter.set(storageKey, identities)

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
        const identities = await this.storageAdapter.get(this.storageKey)

        if (!identities[identifier]) {
            return null
        }

        return identities[identifier]
    }

    async getCurrentIdentity(): Promise<Identity> {
        const entry = await this.storageAdapter.get(`${this.storageKey}_currentIdentity`)

        const currentIdentity = entry['currentIdentity']

        if (!currentIdentity) {
            return null
        }

        return this.getByIdentifier(currentIdentity)
    }
}
