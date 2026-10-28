import { DashPlatformSDK } from 'dash-platform-sdk'
import { DashCoreSDK } from 'dash-core-sdk'
import { PrivateAPIClient } from '../../../../src/types/PrivateAPIClient'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { connectBackend } from '../../../helpers/connectBackend'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import { WalletStoreSchema } from '../../../../src/content-script/storage/storageSchema'
import { WalletType } from '../../../../src/types/WalletType'
import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import runMigrations from '../../../../src/content-script/storage/runMigrations'
import { MessagingMethods } from '../../../../src/types/enums/MessagingMethods'

describe('create wallet', () => {
  let privateAPI: PrivateAPI
  let privateAPIClient: PrivateAPIClient
  let sdk: DashPlatformSDK
  let storage: StorageAdapter
  let secretKey: PrivateKey

  beforeEach(async () => {
    const memoryStorageAdapter = new MemoryStorageAdapter()
    sdk = new DashPlatformSDK({ network: 'testnet' })
    const coreSDK = new DashCoreSDK({ network: 'testnet' })

    storage = memoryStorageAdapter
    await runMigrations(storage)

    privateAPI = new PrivateAPI(sdk, coreSDK, memoryStorageAdapter)
    privateAPIClient = new PrivateAPIClient()

    connectBackend(privateAPI)

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

  test('should point the core SDK at the new network too', async () => {
    const before = privateAPI.coreSDK

    await privateAPIClient.switchNetwork('mainnet')

    // DashCoreSDK cannot be re-pointed, so it has to be a new instance.
    expect(privateAPI.coreSDK).not.toBe(before)
    expect(privateAPI.coreSDK.network).toBe('mainnet')
  })

  test('should hand the handlers the new SDKs', async () => {
    const before = privateAPI.handlers[MessagingMethods.GET_STATUS]

    await privateAPIClient.switchNetwork('mainnet')

    // The table captures both SDKs when it is built, so it has to be rebuilt.
    expect(privateAPI.handlers[MessagingMethods.GET_STATUS]).not.toBe(before)
  })

  test('should point the platform SDK at the new network', async () => {
    await privateAPIClient.switchNetwork('mainnet')

    expect(sdk.getNetwork()).toBe('mainnet')
  })

  test('should leave everything alone when the network is already current', async () => {
    const before = privateAPI.coreSDK

    await privateAPIClient.switchNetwork('testnet')

    expect(privateAPI.coreSDK).toBe(before)
    expect(await storage.get('network')).toBe('testnet')
  })
})
