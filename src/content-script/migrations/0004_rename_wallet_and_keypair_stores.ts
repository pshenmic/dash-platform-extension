import { StorageAdapter } from '../storage/storageAdapter'

export default async function up (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion == 4) {
    const walletIds = await storageAdapter.get('wallets') as string[]
    const network = await storageAdapter.get('network')

    for (const walletId of walletIds) {
      const wallet = await storageAdapter.get(`wallet_${walletId}_${network}`)

      await storageAdapter.set(`wallet_${network}_${walletId}`, wallet)
      await storageAdapter.remove(`wallet_${walletId}_${network}`)
    }

    const keyPairKeys = Object
        .entries(await storageAdapter.getAll())
        .map(([key, value]) => key)
        .filter(key => key.startsWith('keyPairs_'))

    for (const keyPairKey of keyPairKeys) {
      const wallet = await storageAdapter.get(keyPairKey)

      const [, walletId, network] = keyPairKey.split('_')

      await storageAdapter.set(`keyPairs_${network}_${walletId}`, wallet)
      await storageAdapter.remove(`keyPairs_${walletId}_${network}`)
    }
  }

  await storageAdapter.set('schema_version', 5)
}

// set identityIndex to 0
// rename keypairs and wallets
