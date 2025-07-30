import { StorageAdapter } from '../storage/storageAdapter'
import {KeyPairsSchema} from "../storage/storageSchema";

export default async function renameWalletAndKeyPairsMigration (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion == 3) {
    console.log('Running renameWalletAndKeyPairsMigration migration')

    const walletIds = await storageAdapter.get('wallets') as string[]
    const network = await storageAdapter.get('network')

    for (const walletId of walletIds) {
      const wallet = await storageAdapter.get(`wallet_${walletId}_${network}`)

      await storageAdapter.set(`wallet_${network}_${walletId}`, wallet)
      await storageAdapter.remove(`wallet_${walletId}_${network}`)
    }

    for (const walletId of walletIds) {
      const keyPairs = await storageAdapter.get(`keyPairs_${walletId}_${network}`) as KeyPairsSchema

      await storageAdapter.set(`keyPairs_${network}_${walletId}`, keyPairs)
      await storageAdapter.remove(`keyPairs_${walletId}_${network}`)
    }
  }

  await storageAdapter.set('schema_version', 4)
}

// set identityIndex to 0
// rename keypairs and wallets
