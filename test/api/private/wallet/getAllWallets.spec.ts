import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateAPIClient } from '../../../../src/types/PrivateAPIClient'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import { WalletType } from '../../../../src/types/WalletType'
import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import runMigrations from '../../../../src/content-script/storage/runMigrations'

describe('get all wallets', () => {
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

  test('should create a keystore wallet', async () => {
    const { walletId: firstWalletId } = await privateAPIClient.createWallet(WalletType.keystore)
    const { walletId: secondWalletId } = await privateAPIClient.createWallet(WalletType.keystore)
    const { walletId: thirdWalletId } = await privateAPIClient.createWallet(WalletType.keystore)

    const wallets = await privateAPIClient.getAllWallets()

    expect(wallets.map(wallet => wallet.walletId)).toStrictEqual([firstWalletId, secondWalletId, thirdWalletId])
  })
})
