import initialSchemaMigration from '../migrations/0001_initial_schema'
import addAllWalletsMigrations from '../migrations/0002_add_all_wallets'
import addIndexToIdentitiesMigration from '../migrations/0003_identities_set_index'
import renameWalletAndKeyPairsMigration from '../migrations/0004_rename_wallet_and_keypair_stores'
import addEncryptedMnemonic from '../migrations/0005_add_encrypted_mnemonic'
import moveCurrentIdentityToWallet from '../migrations/0006_move_current_identity_to_wallet'

import { StorageAdapter } from './storageAdapter'

const migrations = [
  initialSchemaMigration,
  addAllWalletsMigrations,
  addIndexToIdentitiesMigration,
  renameWalletAndKeyPairsMigration,
  addEncryptedMnemonic,
  moveCurrentIdentityToWallet
]

export default async function runMigrations (storageAdapter: StorageAdapter): Promise<void> {
  for (const migrate of migrations) {
    await migrate(storageAdapter)
  }
}
