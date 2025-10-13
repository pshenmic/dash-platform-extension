import { StorageAdapter } from '../storage/storageAdapter'
import { IdentitiesStoreSchema, WalletStoreSchema } from '../storage/storageSchema'
import { SCHEMA_VERSION } from '../../constants'

// set all identities to regular, hoping nobody put masternode identities in the extension yet
export default async function moveCurrentIdentityToWallet (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion === 6) {
    const walletIds = await storageAdapter.get('wallets') as string[]

    const wallets = (await Promise.all(walletIds.map(async (walletId) => {
      const mainnetWallet = await storageAdapter.get(`wallet_mainnet_${walletId}`) as WalletStoreSchema
      const testnetWallet = await storageAdapter.get(`wallet_testnet_${walletId}`) as WalletStoreSchema
      return mainnetWallet ?? testnetWallet ?? undefined
    }))).filter(e => e != null)

    for (const wallet of wallets) {
      const walletIdentities = await storageAdapter.get(`identities_${wallet.network}_${wallet.walletId}`) as IdentitiesStoreSchema

      for (const identityId of Object.keys(walletIdentities)) {
        const migratedIdentity = { ...walletIdentities[identityId], type: 'regular', proTxHash: null }

        await storageAdapter.set(`identities_${wallet.network}_${wallet.walletId}`, { [identityId]: migratedIdentity })
      }
    }

    await storageAdapter.set('schema_version', SCHEMA_VERSION)
  }
}
