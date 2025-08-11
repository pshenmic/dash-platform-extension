import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateAPIClient } from '../../../../src/types/PrivateAPIClient'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import { WalletStoreSchema } from '../../../../src/content-script/storage/storageSchema'
import { WalletType } from '../../../../src/types/WalletType'
import hash from 'hash.js'
import { decrypt, PrivateKey } from 'eciesjs'
import { bytesToUtf8, hexToBytes } from '../../../../src/utils'
import runMigrations from '../../../../src/content-script/storage/runMigrations'

describe('switch identity', () => {
    let privateAPI: PrivateAPI
    let privateAPIClient: PrivateAPIClient
    let storage: StorageAdapter
    let secretKey: PrivateKey

    beforeEach(async () => {
        const sdk = new DashPlatformSDK()
        const memoryStorageAdapter = new MemoryStorageAdapter()

        storage = memoryStorageAdapter
        await runMigrations(storage)

        privateAPI = new PrivateAPI(sdk, memoryStorageAdapter)
        privateAPIClient = new PrivateAPIClient()

        privateAPI.init()

        const password = 'test'
        const passwordHash = hash.sha256().update(password).digest('hex')

        secretKey = PrivateKey.fromHex(passwordHash)
        const passwordPublicKey = secretKey.publicKey.toHex()

        await storage.set('network', 'testnet')
        await storage.set('passwordPublicKey', passwordPublicKey)
    })

    test('should switch identity', async () => {
        const mnemonic = 'frequent situate velvet inform help family salad park torch zero chapter right'

        const { walletId: firstWalletId } = await privateAPIClient.createWallet(WalletType.keystore)
        const { walletId: secondWalletId } = await privateAPIClient.createWallet(WalletType.keystore)

        await storage.set('currentWalletId', firstWalletId)

        let expectedWallet: WalletStoreSchema = {
            walletId: firstWalletId,
            network: 'testnet',
            type: 'keystore',
            label: null,
            encryptedMnemonic: null,
            seedHash: null,
            currentIdentity: null
        }

        const storageKey = `wallet_testnet_${firstWalletId}`

        let walletStoreSchema = await storage.get(`wallet_testnet_${firstWalletId}`) as WalletStoreSchema

        expect(walletStoreSchema).toStrictEqual(expectedWallet)

        await privateAPIClient.switchWallet(secondWalletId, 'testnet')

        walletStoreSchema = await storage.get(`wallet_testnet_${secondWalletId}`) as WalletStoreSchema

        expectedWallet = {
            walletId: secondWalletId,
            network: 'testnet',
            type: 'keystore',
            label: null,
            encryptedMnemonic: null,
            seedHash: null,
            currentIdentity: null
        }

        expect(walletStoreSchema).toStrictEqual(expectedWallet)
        expect(await storage.get('currentWalletId')).toEqual(secondWalletId)
    })

})
