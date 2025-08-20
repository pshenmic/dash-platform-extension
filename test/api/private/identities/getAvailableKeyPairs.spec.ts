import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateAPIClient } from '../../../../src/types/PrivateAPIClient'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import { WalletType } from '../../../../src/types/WalletType'
import runMigrations from '../../../../src/content-script/storage/runMigrations'

describe('get available key pairs', () => {
  let privateAPI: PrivateAPI
  let privateAPIClient: PrivateAPIClient
  let storage: StorageAdapter

  beforeEach(async () => {
    const sdk = new DashPlatformSDK()
    const memoryStorageAdapter = new MemoryStorageAdapter()

    storage = memoryStorageAdapter
    await runMigrations(storage)

    privateAPI = new PrivateAPI(sdk, memoryStorageAdapter)
    privateAPIClient = new PrivateAPIClient()

    privateAPI.init()

    await storage.set('network', 'testnet')
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
