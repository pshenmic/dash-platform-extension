import { StorageAdapter } from '../storage/storageAdapter'
import {IdentitiesStoreSchema} from "../storage/storageSchema";

export default async function up (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion == 2) {
    const network = await storageAdapter.get('network') as string
    const wallets = await storageAdapter.get('wallets') as string[]

    for (const walletId of wallets) {
      const walletIdentities = await storageAdapter.get(`identities_${walletId}_${network}`) as IdentitiesStoreSchema

      if (walletIdentities != null) {
        const identityId = Object.keys(walletIdentities)[0]
        const migratedIdentity = {...walletIdentities[identityId], index: 0}

        await storageAdapter.set(`identities_${walletId}_${network}`, {[identityId]: migratedIdentity})
      }
    }
  }

  await storageAdapter.set('schema_version', 3)
}

// set identityIndex to 0
// rename keypairs and wallets
