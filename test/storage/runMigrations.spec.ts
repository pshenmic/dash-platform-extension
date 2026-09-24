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

  // Storage at schema 5 has to pass through every later step, not stop after the
  // first one: each step only runs when the stored version is exactly its own.
  test('runs every migration step when upgrading across several versions', async () => {
    await storage.set('schema_version', 5)
    await storage.set('network', 'testnet')
    await storage.set('wallets', ['w1'])
    await storage.set('currentIdentity', 'id1')
    await storage.set('wallet_testnet_w1', {
      walletId: 'w1',
      network: 'testnet',
      type: 'seedphrase',
      label: null,
      encryptedMnemonic: 'encryptedMnemonic',
      seedHash: null
    })
    await storage.set('identities_testnet_w1', {
      id1: { index: 0, identifier: 'id1', label: null, proTxHash: 'proTxHash', type: 'masternode' }
    })
    await storage.set('stateTransitions_testnet_w1', {
      h1: { hash: 'h1', unsigned: 'unsigned', signature: null, signaturePublicKeyId: null, status: 'pending' }
    })

    await runMigrations(storage)

    expect(await storage.get('schema_version')).toBe(9)
    // 6: the selected identity moved into the wallet
    expect(await storage.get('currentIdentity')).toBeNull()
    expect(await storage.get('wallet_testnet_w1')).toMatchObject({ currentIdentity: 'id1' })
    // 7: identities made regular
    expect(await storage.get('identities_testnet_w1')).toEqual({
      id1: { index: 0, identifier: 'id1', label: null, proTxHash: null, type: 'regular' }
    })
    // 9: state transitions keyed by their unsigned hash, with the new fields
    expect(await storage.get('stateTransitions_testnet_w1')).toEqual({
      h1: { unsignedHash: 'h1', signedHash: null, unsigned: 'unsigned', signature: null, signaturePublicKeyId: null, status: 'pending', error: null }
    })
  })
})
