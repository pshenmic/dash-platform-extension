import initialSchemaMigration from '../migrations/0001_initial_schema'
import { StorageAdapter } from './storageAdapter'

export default async function runMigrations (storageAdapter: StorageAdapter): Promise<void> {
  await initialSchemaMigration(storageAdapter)
}
