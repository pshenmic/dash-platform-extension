import {StorageAdapter} from "../storage/storageAdapter";
import {Identity} from "../../types/Identity";
import {IdentityPublicKeyWASM, DashPlatformProtocolWASM} from 'pshenmic-dpp'
import {IdentitiesStoreSchema, IdentityStoreSchema} from "../storage/storageSchema";
import {base64} from "@scure/base";

export class IdentitiesRepository {
    dpp: DashPlatformProtocolWASM
    storageAdapter: StorageAdapter

    constructor(storageAdapter: StorageAdapter, dpp: DashPlatformProtocolWASM) {
        this.dpp = dpp
        this.storageAdapter = storageAdapter
    }

    async create(index: number, identifier: string, identityPublicKeys: IdentityPublicKeyWASM[]): Promise<Identity> {
        const network = await this.storageAdapter.get('network')
        const walletId = await this.storageAdapter.get('currentWalletId')

        const storageKey = `identities_${network}_${walletId}`

        const identities = await this.storageAdapter.get(storageKey)

        const identityStoreSchema: IdentityStoreSchema = {
            index,
            label: null,
            identifier,
            identityPublicKeys: identityPublicKeys.map(identityPublicKey => base64.encode(identityPublicKey.toBytes()))
        }

        identities[identifier] = identityStoreSchema

        await this.storageAdapter.set(storageKey, identities)
        await this.storageAdapter.set('currentIdentity', identifier)

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


    async getByIdentifier(identifier: string): Promise<Identity|null> {
        const network = await this.storageAdapter.get('network')
        const walletId = await this.storageAdapter.get('currentWalletId')

        const storageKey = `identities_${network}_${walletId}`

        const identities = await this.storageAdapter.get(storageKey) as IdentitiesStoreSchema

        const identity = identities[identifier]

        if (!identities[identifier]) {
            return null
        }

        return {
            index: identity.index,
            identifier: identity.identifier,
            label: identity.label,
            identityPublicKeys: identity.identityPublicKeys.map((identityPublicKey) => this.dpp.IdentityPublicKeyWASM.fromHex(identityPublicKey))
        }
    }

    async getCurrentIdentity(): Promise<Identity|null> {
        const currentIdentity = await this.storageAdapter.get('currentIdentity') as string

        if (!currentIdentity) {
            return null
        }

        const identity = await this.getByIdentifier(currentIdentity)

        if (!identity) {
            throw new Error(`Could not find current identity ${currentIdentity}`)
        }

        return identity
    }
}
