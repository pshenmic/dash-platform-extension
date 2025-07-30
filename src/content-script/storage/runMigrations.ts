import initialSchemaMigration from '../migrations/0001_initial_schema'
import identitiesSetIndex from '../migrations/0002_identities_set_index'
import { StorageAdapter } from './storageAdapter'

export default async function runMigrations (storageAdapter: StorageAdapter): Promise<void> {
  await initialSchemaMigration(storageAdapter)
  await identitiesSetIndex(storageAdapter)
}
