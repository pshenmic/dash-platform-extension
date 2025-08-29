import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import runMigrations from '../../../../src/content-script/storage/runMigrations'
import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import {PrivateAPIClient} from "../../../../src/types/PrivateAPIClient";
import {WalletType} from "../../../../src/types/WalletType";

describe('get available key pairs', () => {
  let privateAPI: PrivateAPI
  let privateAPIClient: PrivateAPIClient
  let secretKey: PrivateKey
  let storage: StorageAdapter

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

  test('should list available keys for wallet type keystore', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)
    const identity = 'J6toeWxpVqqgL8H21mAsLzcM6Sf8cPbzTqYoX7GsrzRj'

    await storage.set('currentWalletId', walletId)

    await privateAPIClient.importIdentity(identity, ['3eb1e386ee623138ac9454d117bf07abb36f54a83c982679f615c4c3ec7e9a78', '7ce07b2720541a558fbabf44014bedc8f294e82d3c80aadc067291e7e44bf0ae'])

    const keyIds = await privateAPIClient.getAvailableKeyPairs(identity)

    expect(keyIds).toStrictEqual([4, 5])
  })
})
