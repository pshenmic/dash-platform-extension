import { StorageAdapter } from '../storage/storageAdapter'
import { WalletStoreSchema } from '../storage/storageSchema'

export default async function moveCurrentIdentityToWallet (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion === 5) {

    const currentIdentity = await storageAdapter.get('wallets') as string | null
    const network = await storageAdapter.get('network') as string
    const walletIds = await storageAdapter.get('wallets') as string[]
    const [walletId] = walletIds

    const wallet = await storageAdapter.get(`wallet_${walletId}_${network}`) as WalletStoreSchema

    if (currentIdentity !== null) {
      wallet.currentIdentity = currentIdentity
    }

    await storageAdapter.set(`wallet_${walletId}_${network}`, wallet)
    await storageAdapter.remove('currentIdentity')
  }

  await storageAdapter.set('schema_version', 6)
}
