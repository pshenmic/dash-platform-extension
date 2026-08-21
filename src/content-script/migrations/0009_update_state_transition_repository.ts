import { StorageAdapter } from '../storage/storageAdapter'
import {
  StateTransitionsStoreSchema,
  WalletStoreSchema
} from '../storage/storageSchema'
import { SCHEMA_VERSION } from '../../constants'

// hash -> unsignedHash
// + signedHash field
// + error field
export default async function updateStateTransitionRepository (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion === 8) {
    const walletIds = await storageAdapter.get('wallets') as string[]

    const wallets = (await Promise.all(walletIds.map(async (walletId) => {
      const mainnetWallet = await storageAdapter.get(`wallet_mainnet_${walletId}`) as WalletStoreSchema
      const testnetWallet = await storageAdapter.get(`wallet_testnet_${walletId}`) as WalletStoreSchema
      return mainnetWallet ?? testnetWallet ?? undefined
    }))).filter(e => e != null)

    for (const wallet of wallets) {
      const stateTransitionsStoreSchema = await storageAdapter.get(`stateTransitions_${wallet.network}_${wallet.walletId}`) as StateTransitionsStoreSchema ?? {}

      for (const unsignedHash of Object.keys(stateTransitionsStoreSchema)) {
        stateTransitionsStoreSchema[unsignedHash] = {
          error: null,
          signature: stateTransitionsStoreSchema[unsignedHash].signature,
          signaturePublicKeyId: stateTransitionsStoreSchema[unsignedHash].signaturePublicKeyId,
          signedHash: null,
          status: stateTransitionsStoreSchema[unsignedHash].status,
          unsigned: stateTransitionsStoreSchema[unsignedHash].unsigned,
          // @ts-expect-error
          unsignedHash: stateTransitionsStoreSchema[unsignedHash].hash
        }
      }

      await storageAdapter.set(`stateTransitions_${wallet.network}_${wallet.walletId}`, stateTransitionsStoreSchema)
    }

    await storageAdapter.set('schema_version', SCHEMA_VERSION)
  }
}
