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

describe('setWalletLabel', () => {
  let privateAPIClient: PrivateAPIClient
  let storage: StorageAdapter

  beforeAll(async () => {
    const sdk = new DashPlatformSDK({ network: 'testnet' })
    const memoryStorageAdapter = new MemoryStorageAdapter()

    storage = memoryStorageAdapter
    await runMigrations(storage)

    const privateAPI = new PrivateAPI(sdk, memoryStorageAdapter)
    privateAPIClient = new PrivateAPIClient()

    privateAPI.init()

    const password = 'test'
    const passwordHash = hash.sha256().update(password).digest('hex')

    const secretKey = PrivateKey.fromHex(passwordHash)
    const passwordPublicKey = secretKey.publicKey.toHex()

    await storage.set('network', 'testnet')
    await storage.set('passwordPublicKey', passwordPublicKey)
  })

  test('should set a label on a wallet', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await privateAPIClient.setWalletLabel(walletId, 'My Wallet')

    const walletStoreSchema = await storage.get(`wallet_testnet_${walletId}`) as WalletStoreSchema

    expect(walletStoreSchema.label).toEqual('My Wallet')
  })

  test('should overwrite an existing label', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await privateAPIClient.setWalletLabel(walletId, 'First Label')
    await privateAPIClient.setWalletLabel(walletId, 'Second Label')

    const walletStoreSchema = await storage.get(`wallet_testnet_${walletId}`) as WalletStoreSchema

    expect(walletStoreSchema.label).toEqual('Second Label')
  })

  test('should return null label before label is set', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    const wallets = await privateAPIClient.getAllWallets()
    const wallet = wallets.find(w => w.walletId === walletId)

    expect(wallet?.label).toBeNull()
  })

  test('should reflect updated label in getAllWallets after label is set', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await privateAPIClient.setWalletLabel(walletId, 'My Wallet')

    const wallets = await privateAPIClient.getAllWallets()
    const wallet = wallets.find(w => w.walletId === walletId)

    expect(wallet?.label).toEqual('My Wallet')
  })

  test('should throw when wallet does not exist', async () => {
    await expect(privateAPIClient.setWalletLabel('nonexistent-wallet-id', 'My Wallet'))
      .rejects.toThrow()
  })

  test('should throw when label is empty', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await expect(privateAPIClient.setWalletLabel(walletId, ''))
      .rejects.toThrow()
  })
})
