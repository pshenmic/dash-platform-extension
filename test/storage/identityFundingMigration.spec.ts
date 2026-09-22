import runMigrations from '../../src/content-script/storage/runMigrations'
import { IsolatedStorage } from '../helpers/isolatedStorage'

test('schema 10 preserves all wallet data and legacy deposit keys on repeat migration', async () => {
  const storage = new IsolatedStorage()
  const records = {
    schema_version: 9,
    wallets: ['wallet1'],
    wallet_testnet_wallet1: { coreXpubs: { 0: 'core' }, platformXpubs: { 0: 'platform' }, shieldedAddressCounts: { 0: 25 } },
    assetLockFundingAddresses_testnet_wallet1: { legacy: { encryptedPrivateKey: 'encrypted', assetLockTxid: 'txid', registrationIdentityIndex: 3 } },
    identities_testnet_wallet1: { identity: { index: 2 } }
  }
  for (const [key, value] of Object.entries(records)) await storage.set(key, value)
  await runMigrations(storage)
  await runMigrations(storage)
  expect(await storage.getAll()).toEqual({ ...records, schema_version: 10 })
})
