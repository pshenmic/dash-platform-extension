import { StorageAdapter } from '../storage/storageAdapter'

export default async function initialSchemaMigration (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion == null) {
    console.log('Running schemaVersion migration')

    await storageAdapter.set('schema_version', 1)
    await storageAdapter.set('network', 'testnet')
    await storageAdapter.set('currentWalletId', null)
    await storageAdapter.set('passwordPublicKey', null)
  }
}

// set identityIndex to 0
//
