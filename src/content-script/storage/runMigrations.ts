import initialSchemaMigration from '../migrations/0001_initial_schema'
import addAllWalletsMigrations from '../migrations/0002_add_all_wallets'
import addIndexToIdentitiesMigration from '../migrations/0003_identities_set_index'
import renameWalletAndKeyPairsMigration from '../migrations/0004_rename_wallet_and_keypair_stores'
import addEncryptedMnemonic from '../migrations/0005_add_encrypted_mnemonic'
import moveCurrentIdentityToWallet from '../migrations/0006_move_current_identity_to_wallet'
import addIdentityType from '../migrations/0007_add_identity_type'
import removeIdentityPublicKey from '../migrations/0008_remove_identity_public_key'

import { StorageAdapter } from './storageAdapter'
import { SCHEMA_VERSION } from '../../constants'

const migrations = [
  initialSchemaMigration,
  addAllWalletsMigrations,
  addIndexToIdentitiesMigration,
  renameWalletAndKeyPairsMigration,
  addEncryptedMnemonic,
  moveCurrentIdentityToWallet,
  addIdentityType,
  removeIdentityPublicKey
]

const restoreBackup = async (backup: object, storageAdapter: StorageAdapter): Promise<void> => {
  for (const key of Object.keys(backup)) {
    await storageAdapter.set(key, backup[key])
  }
}

export default async function runMigrations (storageAdapter: StorageAdapter): Promise<void> {
  const backup = await storageAdapter.getAll()

  try {
    for (const migrate of migrations) {
      await migrate(storageAdapter)
    }
  } catch (e) {
    await restoreBackup(backup, storageAdapter)

    throw e
  }

  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion !== SCHEMA_VERSION) {
    await restoreBackup(backup, storageAdapter)
    throw new Error('Incorrect schema version after migrations')
  }
}
