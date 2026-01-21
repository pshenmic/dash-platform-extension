import { StorageAdapter } from '../storage/storageAdapter'
import { IdentitiesStoreSchema, KeyPairsSchema, WalletStoreSchema } from '../storage/storageSchema'
import { SCHEMA_VERSION } from '../../constants'
import { IdentityPublicKeyWASM } from 'pshenmic-dpp'

export default async function removeIdentityPublicKey (storageAdapter: StorageAdapter): Promise<void> {
  const schemaVersion = await storageAdapter.get('schema_version') as number

  if (schemaVersion === 7) {
    const walletIds = await storageAdapter.get('wallets') as string[]

    const wallets = (await Promise.all(walletIds.map(async (walletId) => {
      const mainnetWallet = await storageAdapter.get(`wallet_mainnet_${walletId}`) as WalletStoreSchema
      const testnetWallet = await storageAdapter.get(`wallet_testnet_${walletId}`) as WalletStoreSchema
      return mainnetWallet ?? testnetWallet ?? undefined
    }))).filter(e => e != null)

    for (const wallet of wallets) {
      if (wallet.type === 'keystore') {
        const walletIdentities = await storageAdapter.get(`identities_${wallet.network}_${wallet.walletId}`) as IdentitiesStoreSchema ?? {}

        for (const identityId of Object.keys(walletIdentities)) {
          const keyPairsSchema = await storageAdapter.get(`keyPairs_${wallet.network}_${wallet.walletId}`) as KeyPairsSchema

          const keyPairs = keyPairsSchema[identityId]

          keyPairsSchema[identityId] = keyPairs.map((keyPair) => ({
            // @ts-expect-error
            keyId: IdentityPublicKeyWASM.fromBase64(keyPair.identityPublicKey).keyId,
            pending: keyPair.pending ?? false,
            encryptedPrivateKey: keyPair.encryptedPrivateKey
          }))

          await storageAdapter.set(`keyPairs_${wallet.network}_${wallet.walletId}`, keyPairsSchema)
        }
      }
    }

    await storageAdapter.set('schema_version', SCHEMA_VERSION)
  }
}
