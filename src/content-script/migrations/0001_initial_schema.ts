import { StorageAdapter } from '../storage/storageAdapter'

export default async function up (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion == null) {
    await storageAdapter.set('schema_version', 1)
    await storageAdapter.set('network', 'testnet')
    await storageAdapter.set('currentWalletId', null)
    await storageAdapter.set('passwordPublicKey', null)
  }
}

// set identityIndex to 0
//
