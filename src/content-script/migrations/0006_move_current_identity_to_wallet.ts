import { StorageAdapter } from '../storage/storageAdapter'
import { WalletStoreSchema } from '../storage/storageSchema'
import { SCHEMA_VERSION } from '../../constants'

export default async function moveCurrentIdentityToWallet (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion === 5) {
    const currentIdentity = (await storageAdapter.get('currentIdentity') as string | null) ?? null
    const network = await storageAdapter.get('network') as string
    const walletIds = await storageAdapter.get('wallets') as string[]
    const [walletId] = walletIds

    if (walletId != null) {
      const wallet = await storageAdapter.get(`wallet_${network}_${walletId}`) as WalletStoreSchema

      wallet.currentIdentity = currentIdentity

      await storageAdapter.set(`wallet_${network}_${walletId}`, wallet)
      await storageAdapter.remove('currentIdentity')
    }

    await storageAdapter.set('schema_version', SCHEMA_VERSION)
  }
}
