import {StorageAdapter} from "../storage/storageAdapter";
import {generateWalletId} from "../../utils";
import {Network} from "../../types/enums/Network";
import {WalletStoreSchema} from "../storage/storageSchema";
import {PublicKey} from "eciesjs";
import {WalletType} from "../../types/WalletType";
import {Wallet} from "../../types/Wallet";

export class WalletRepository {
    storageKey: string
    storageAdapter: StorageAdapter

    constructor(storageAdapter: StorageAdapter) {
        this.storageAdapter = storageAdapter
    }

    async create(type: WalletType, passwordPublicKey: PublicKey): Promise<void> {
        const currentNetwork = await this.storageAdapter.get('network') as string
        const walletId = generateWalletId()

        const storageKey = `wallet_${walletId}_${currentNetwork}`

        const wallet = await this.storageAdapter.get(storageKey) as WalletStoreSchema

        if (wallet) {
            throw new Error('Wallet with such id already exists')
        }

        const walletSchema: WalletStoreSchema = {
            currentIdentity: null,
            label: null,
            network: Network[currentNetwork],
            type,
            walletId
        }

        await this.storageAdapter.set(this.storageKey, walletSchema)
    }

    async get(): Promise<Wallet> {
        const currentNetwork = await this.storageAdapter.get('network') as string
        const walletId = await this.storageAdapter.get('currentWalletId') as string

        if (!walletId) {
            throw new Error('Default wallet is not chosen')
        }

        const storageKey = `wallet_${walletId}_${currentNetwork}`

        const walletStoreSchema = await this.storageAdapter.get(storageKey) as WalletStoreSchema

        if (!walletStoreSchema) {
            throw new Error(`Could not find wallet ${walletId} for network ${currentNetwork}`)
        }

        return {
            walletId: walletStoreSchema.walletId,
            type: WalletType[walletStoreSchema.type],
            network: Network[currentNetwork],
            label: walletStoreSchema.label,
            currentIdentity: walletStoreSchema.currentIdentity,
        }
    }

    async switchWallet(network: Network, walletId: string): Promise<void> {
        await this.storageAdapter.set('network', network)
        await this.storageAdapter.set('walletId', walletId)
    }
}
