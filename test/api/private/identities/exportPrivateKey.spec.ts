import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKey } from 'eciesjs'
import hash from 'hash.js'
import { PrivateAPIClient, WalletType } from '../../../../src/types'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import runMigrations from '../../../../src/content-script/storage/runMigrations'

describe('exportPrivateKey', () => {
  let privateAPI: PrivateAPI
  let privateAPIClient: PrivateAPIClient
  let storage: StorageAdapter
  let secretKey: PrivateKey
  let mnemonic: string

  beforeEach(async () => {
    const sdk = new DashPlatformSDK({ network: 'testnet' })
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

    mnemonic = 'frequent situate velvet inform help family salad park torch zero chapter right'

    await storage.set('network', 'testnet')
    await storage.set('passwordPublicKey', passwordPublicKey)
  })

  test('should export private key from keystore wallet', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await privateAPIClient.switchWallet(walletId)

    const identity = 'J6toeWxpVqqgL8H21mAsLzcM6Sf8cPbzTqYoX7GsrzRj'

    await privateAPIClient.importIdentity(identity, ['3eb1e386ee623138ac9454d117bf07abb36f54a83c982679f615c4c3ec7e9a78'])

    const privateKey = await privateAPIClient.exportPrivateKey(identity, 4, 'test')
    expect(privateKey.wif).toBe('cPga9SSbAwfoCi6QCpoVMCuW93ScUHTQ1Pgdoz58DZ6h8dA7YPzq')
    expect(privateKey.hex).toBe('3eb1e386ee623138ac9454d117bf07abb36f54a83c982679f615c4c3ec7e9a78')
  })

  test('should export private key from seedphrase wallet', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.seedphrase, mnemonic)

    await privateAPIClient.switchWallet(walletId)
    await privateAPIClient.resyncIdentities('test')

    const privateKey = await privateAPIClient.exportPrivateKey('2MfmHqYmAk1jAQNv7SsGJPT22MrfKFcHKZDc7cTu2biX', 4, 'test')

    expect(privateKey.wif).toBe('cTH8iAXphX2GHqMsvc1NZTnxgVn859G6XRVJekxtASffDqtLW1Yy')
    expect(privateKey.hex).toBe('a9fc9e209d5b3f73b09d5062e1f9729e3ff288ab0012c0a4851e6a94683d7208')
  })
})
