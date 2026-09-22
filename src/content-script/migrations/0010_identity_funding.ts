import { StorageAdapter } from '../storage/storageAdapter'

// identityFunding_<network>_<walletId> is created lazily. Existing legacy
// deposits and all derivation counters must survive this migration unchanged.
export default async function addIdentityFunding (storageAdapter: StorageAdapter): Promise<void> {
  if (await storageAdapter.get('schema_version') === 9) await storageAdapter.set('schema_version', 10)
}
