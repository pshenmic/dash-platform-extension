import {StorageAdapter} from "../storage/storageAdapter";

export default async function up(storageAdapter: StorageAdapter) {
    const version = await storageAdapter.get('schema_version') as number

    if (!version) {
        await storageAdapter.set('schema_version', 1)
        await storageAdapter.set('currentWalletId', null)
        await storageAdapter.set('network', 'testnet')
    }
}
