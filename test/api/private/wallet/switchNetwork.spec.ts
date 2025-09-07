import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateAPIClient } from '../../../../src/types/PrivateAPIClient'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import { WalletStoreSchema } from '../../../../src/content-script/storage/storageSchema'
import { WalletType } from '../../../../src/types/WalletType'
import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import runMigrations from '../../../../src/content-script/storage/runMigrations'

describe('create wallet', () => {
  let privateAPI: PrivateAPI
  let privateAPIClient: PrivateAPIClient
  let sdk: DashPlatformSDK
  let storage: StorageAdapter
  let secretKey: PrivateKey

  beforeEach(async () => {
    const memoryStorageAdapter = new MemoryStorageAdapter()
    sdk = new DashPlatformSDK({ network: 'testnet' })

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

  test('should switch network', async () => {
    const { walletId: firstWalletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await storage.set('currentWalletId', firstWalletId)

    const expectedWallet: WalletStoreSchema = {
      walletId: firstWalletId,
      network: 'testnet',
      type: 'keystore',
      label: null,
      encryptedMnemonic: null,
      seedHash: null,
      currentIdentity: null
    }

    const walletStoreSchema = await storage.get(`wallet_testnet_${firstWalletId}`) as WalletStoreSchema

    expect(walletStoreSchema).toStrictEqual(expectedWallet)

    await privateAPIClient.switchNetwork('mainnet')

    const network = await storage.get('network') as string
    expect(network).toBe('mainnet')
    // expect sdk changed network
    expect(sdk.network).toBe('mainnet')
  })
})
