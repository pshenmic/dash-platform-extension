import { StorageAdapter } from '../storage/storageAdapter'

export default async function up (storageAdapter: StorageAdapter): Promise<void> {
  const version = await storageAdapter.get('schema_version') as number

  if (version == null) {
    await storageAdapter.set('schema_version', 1)
    await storageAdapter.set('network', 'testnet')
    await storageAdapter.set('currentWalletId', null)
    await storageAdapter.set('passwordPublicKey', null)
  }
}
