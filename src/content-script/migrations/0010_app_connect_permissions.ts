import { StorageAdapter } from '../storage/storageAdapter'
import { WalletStoreSchema } from '../storage/storageSchema'

// A connected website now sees only the identities it was granted, and the
// grant lives in the appConnect entry. Entries made before this have no grant
// at all, and silently granting them everything is exactly what the permission
// model is there to prevent - so they are dropped and every site reconnects.
export default async function dropAppConnectsWithoutPermissions (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion === 9) {
    const walletIds = await storageAdapter.get('wallets') as string[]

    const wallets = (await Promise.all(walletIds.map(async (walletId) => {
      const mainnetWallet = await storageAdapter.get(`wallet_mainnet_${walletId}`) as WalletStoreSchema
      const testnetWallet = await storageAdapter.get(`wallet_testnet_${walletId}`) as WalletStoreSchema
      return mainnetWallet ?? testnetWallet ?? undefined
    }))).filter(e => e != null)

    for (const wallet of wallets) {
      await storageAdapter.set(`appConnects_${wallet.network}_${wallet.walletId}`, {})
    }

    await storageAdapter.set('schema_version', 10)
  }
}
