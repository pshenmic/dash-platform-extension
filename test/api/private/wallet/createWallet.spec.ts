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

describe('create wallet', () => {
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

  test('should create a seedphrase wallet', async () => {
    const mnemonic = 'frequent situate velvet inform help family salad park torch zero chapter right'

    const { walletId } = await privateAPIClient.createWallet(WalletType.seedphrase, mnemonic)

    const expectedWallet: WalletStoreSchema = {
      walletId,
      network: 'testnet',
      type: 'seedphrase',
      label: null,
      encryptedMnemonic: null,
      seedHash: null
    }

    const storageKey = `wallet_testnet_${walletId}`

    const walletStoreSchema = await storage.get(storageKey) as WalletStoreSchema

    expect(walletStoreSchema.walletId).toEqual(expectedWallet.walletId)
    expect(walletStoreSchema.network).toEqual(expectedWallet.network)
    expect(walletStoreSchema.type).toEqual(expectedWallet.type)
    expect(walletStoreSchema.label).toEqual(expectedWallet.label)

    expect(bytesToUtf8(decrypt(secretKey.toHex(), hexToBytes(walletStoreSchema.encryptedMnemonic as string)))).toEqual(mnemonic)
    expect(hash.sha256().update(mnemonic).digest('hex')).toEqual(walletStoreSchema.seedHash)
  })

  test('should create a keystore wallet', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    const expectedWallet: WalletStoreSchema = {
      walletId,
      network: 'testnet',
      type: 'keystore',
      label: null,
      encryptedMnemonic: null,
      seedHash: null
    }

    const storageKey = `wallet_testnet_${walletId}`

    const walletStoreSchema = await storage.get(storageKey) as WalletStoreSchema

    expect(walletStoreSchema).toStrictEqual(expectedWallet)
  })
})
