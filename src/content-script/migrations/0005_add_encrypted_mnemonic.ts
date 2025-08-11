import { StorageAdapter } from '../storage/storageAdapter'
import { WalletStoreSchema } from '../storage/storageSchema'

export default async function addEncryptedMnemonic (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion === 4) {
    console.log('addEncryptedMnemonic', schemaVersion)

    const walletIds = await storageAdapter.get('wallets') as string[]
    const network = await storageAdapter.get('network') as string

    for (const walletId of walletIds) {
      const wallet = await storageAdapter.get(`wallet_${walletId}_${network}`) as WalletStoreSchema

      wallet.encryptedMnemonic = null

      await storageAdapter.set(`wallet_${walletId}_${network}`, wallet)
    }

    await storageAdapter.set('schema_version', 5)
  }

}
