import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateAPIClient, WalletType } from '../../../../src/types'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import runMigrations from '../../../../src/content-script/storage/runMigrations'
import { KeyPairsSchema } from '../../../../src/content-script/storage/storageSchema'

describe('remove identity private key', () => {
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

  test('should remove keypair from identity', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await storage.set('currentWalletId', walletId)
    const identity = 'J6toeWxpVqqgL8H21mAsLzcM6Sf8cPbzTqYoX7GsrzRj'

    const privateKey = '3eb1e386ee623138ac9454d117bf07abb36f54a83c982679f615c4c3ec7e9a78'
    const privateKey2 = '7ce07b2720541a558fbabf44014bedc8f294e82d3c80aadc067291e7e44bf0ae'

    await privateAPIClient.importIdentity(identity, [privateKey, privateKey2])

    const keyPairStoreSchema = await storage.get(`keyPairs_testnet_${walletId}`) as KeyPairsSchema

    expect(keyPairStoreSchema[identity].length).toBe(2)

    let keyIds = await privateAPIClient.getAvailableKeyPairs(identity)

    expect(keyIds).toStrictEqual([4, 5])

    await privateAPIClient.removeIdentityPrivateKey(identity, 5)

    keyIds = await privateAPIClient.getAvailableKeyPairs(identity)

    expect(keyIds).toStrictEqual([4])
  })
})
