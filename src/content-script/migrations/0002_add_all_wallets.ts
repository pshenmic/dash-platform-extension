import { StorageAdapter } from '../storage/storageAdapter'

export default async function addAllWalletsMigrations (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion === 1) {
    const walletIds = Object
      .entries(await storageAdapter.getAll())
      .map(([key, value]) => key)
      .filter(key => key.startsWith('wallet_'))
      .map((key) => key.split('_')[1])

    await storageAdapter.set('wallets', walletIds)
  }

  await storageAdapter.set('schema_version', 2)
}
