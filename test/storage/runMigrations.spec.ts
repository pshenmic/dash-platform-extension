import { StorageAdapter } from '../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../src/content-script/storage/memoryStorageAdapter'
import runMigrations from '../../src/content-script/storage/runMigrations'

describe('run migrations', () => {
  let storage: StorageAdapter

  beforeEach(async () => {
    storage = new MemoryStorageAdapter()
  })

  test('should resync identities', async () => {
    await runMigrations(storage)
  })
})
