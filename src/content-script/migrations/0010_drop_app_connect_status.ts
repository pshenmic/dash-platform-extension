import { StorageAdapter } from '../storage/storageAdapter'
import {
  AppConnectsStorageSchema,
  WalletStoreSchema
} from '../storage/storageSchema'
import { SCHEMA_VERSION } from '../../constants'

// Drop status field from AppConnect records.
// Non-approved records (rejected/error/pending) are deleted entirely —
// presence of a record now means "connection approved".
export default async function dropAppConnectStatus (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion === 9) {
    const walletIds = (await storageAdapter.get('wallets') as string[] | null) ?? []

    const wallets = (await Promise.all(walletIds.map(async (walletId) => {
      const mainnetWallet = await storageAdapter.get(`wallet_mainnet_${walletId}`) as WalletStoreSchema
      const testnetWallet = await storageAdapter.get(`wallet_testnet_${walletId}`) as WalletStoreSchema
      return mainnetWallet ?? testnetWallet ?? undefined
    }))).filter(e => e != null)

    for (const wallet of wallets) {
      const key = `appConnects_${wallet.network}_${wallet.walletId}`
      const raw = await storageAdapter.get(key) as Record<string, { id: string, url: string, status?: string }> | null

      if (raw == null) continue

      const cleaned: AppConnectsStorageSchema = {}

      for (const [id, entry] of Object.entries(raw)) {
        if (entry.status === 'approved' || entry.status == null) {
          cleaned[id] = { id: entry.id, url: entry.url }
        }
      }

      await storageAdapter.set(key, cleaned)
    }

    await storageAdapter.set('schema_version', SCHEMA_VERSION)
  }
}
