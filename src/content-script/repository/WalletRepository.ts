import {StorageAdapter} from "../storage/storageAdapter";
import {generateWalletId} from "../../utils";
import {Network} from "../../types/enums/Network";
import {WalletStoreSchema} from "../storage/storageSchema";
import {WalletType} from "../../types/WalletType";
import {Wallet} from "../../types/Wallet";

export class WalletRepository {
    storageAdapter: StorageAdapter

    constructor(storageAdapter: StorageAdapter) {
        this.storageAdapter = storageAdapter
    }

    async create(type: WalletType): Promise<void> {
        const passwordPublicKey = await this.storageAdapter.get('network') as string

        if (!passwordPublicKey) {
            throw new Error('Password is not set for an extension')
        }

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

        await this.storageAdapter.set(storageKey, walletSchema)
    }

    async getCurrent(): Promise<Wallet|null> {
        const network = await this.storageAdapter.get('network') as string
        const currentWalletId = await this.storageAdapter.get('currentWalletId') as string

        if (!currentWalletId) {
            return null
        }

        const storageKey = `wallet_${currentWalletId}_${network}`

        const wallet = await this.storageAdapter.get(storageKey) as WalletStoreSchema

        if (!wallet) {
            throw new Error("Could not find current wallet")
        }

        return {
            walletId: wallet.walletId,
            type: WalletType[wallet.type],
            network: Network[network],
            label: wallet.label,
            currentIdentity: wallet.currentIdentity,
        }
    }

    async switchWallet(network: Network, walletId: string): Promise<void> {
        await this.storageAdapter.set('network', network)
        await this.storageAdapter.set('walletId', walletId)
    }
}
