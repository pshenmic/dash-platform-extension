import { DashPlatformSDK } from 'dash-platform-sdk'
import { DashCoreSDK } from 'dash-core-sdk'
import { PrivateKey } from 'eciesjs'
import hash from 'hash.js'
import { PrivateAPIClient, WalletType } from '../../../../src/types'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import { IdentitiesStoreSchema, KeyPairsSchema } from '../../../../src/content-script/storage/storageSchema'
import runMigrations from '../../../../src/content-script/storage/runMigrations'

describe('switch identity', () => {
  let privateAPI: PrivateAPI
  let privateAPIClient: PrivateAPIClient
  let storage: StorageAdapter
  let secretKey: PrivateKey

  beforeEach(async () => {
    const sdk = new DashPlatformSDK({ network: 'testnet' })
    const coreSDK = new DashCoreSDK({ network: 'testnet', dapiUrl: 'http://127.0.0.1:1443' })
    const memoryStorageAdapter = new MemoryStorageAdapter()

    storage = memoryStorageAdapter
    await runMigrations(storage)

    privateAPI = new PrivateAPI(sdk, coreSDK, memoryStorageAdapter)
    privateAPIClient = new PrivateAPIClient()

    privateAPI.init()

    const password = 'test'
    const passwordHash = hash.sha256().update(password).digest('hex')

    secretKey = PrivateKey.fromHex(passwordHash)
    const passwordPublicKey = secretKey.publicKey.toHex()

    await storage.set('network', 'testnet')
    await storage.set('passwordPublicKey', passwordPublicKey)
  })

  test('should import identity', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await storage.set('currentWalletId', walletId)
    const identity = 'J6toeWxpVqqgL8H21mAsLzcM6Sf8cPbzTqYoX7GsrzRj'
    const privateKey = '3eb1e386ee623138ac9454d117bf07abb36f54a83c982679f615c4c3ec7e9a78'

    await privateAPIClient.importIdentity(identity, [privateKey])

    const identitiesStoreSchema = await storage.get(`identities_testnet_${walletId}`) as IdentitiesStoreSchema

    expect(Object.keys(identitiesStoreSchema).length).toBe(1)
    expect(identitiesStoreSchema[identity]).toBeDefined()

    const keyPairStoreSchema = await storage.get(`keyPairs_testnet_${walletId}`) as KeyPairsSchema

    expect(keyPairStoreSchema[identity].length).toBe(1)
  })
})
