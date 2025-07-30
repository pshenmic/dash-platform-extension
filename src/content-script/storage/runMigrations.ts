import initialSchemaMigration from '../migrations/0001_initial_schema'
import addAllWalletsMigrations from '../migrations/0002_add_all_wallets'
import addIndexToIdentitiesMigration from '../migrations/0003_identities_set_index'
import renameWalletAndKeyPairsMigration from '../migrations/0004_rename_wallet_and_keypair_stores'

import { StorageAdapter } from './storageAdapter'

export default async function runMigrations (storageAdapter: StorageAdapter): Promise<void> {
  await initialSchemaMigration(storageAdapter)
  await addAllWalletsMigrations(storageAdapter)
  await addIndexToIdentitiesMigration(storageAdapter)
  await renameWalletAndKeyPairsMigration(storageAdapter)
}
