import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateAPIClient, WalletType } from '../../../../src/types'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import runMigrations from '../../../../src/content-script/storage/runMigrations'
import { AppConnectsStorageSchema } from '../../../../src/content-script/storage/storageSchema'
import { AppConnectStatus } from '../../../../src/types/enums/AppConnectStatus'

describe('app connects', () => {
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

  test('should return a list of app connects', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await storage.set('currentWalletId', walletId)
    const identity = 'J6toeWxpVqqgL8H21mAsLzcM6Sf8cPbzTqYoX7GsrzRj'

    const privateKey = '3eb1e386ee623138ac9454d117bf07abb36f54a83c982679f615c4c3ec7e9a78'

    await privateAPIClient.importIdentity(identity, [privateKey])

    const mockAppConnects: AppConnectsStorageSchema = {
      mockId1: { id: 'mockId1', url: 'http://localhost:8080', status: AppConnectStatus.approved },
      mockId2: { id: 'mockId2', url: 'https://google.com', status: AppConnectStatus.rejected }
    }

    await storage.set(`appConnects_testnet_${walletId}`, mockAppConnects)

    const appConnects = await privateAPIClient.getAllAppConnects()

    const expectedAppConnects = [{
      id: 'mockId1',
      url: 'http://localhost:8080',
      status: AppConnectStatus.approved
    }, { id: 'mockId2', url: 'https://google.com', status: AppConnectStatus.rejected }]

    expect(appConnects).toStrictEqual(expectedAppConnects)
  })
})
