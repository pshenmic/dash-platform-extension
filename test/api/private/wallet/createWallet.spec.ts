import {DashPlatformSDK} from 'dash-platform-sdk'
import {PrivateAPIClient} from '../../../../src/types/PrivateAPIClient'
import {PrivateAPI} from '../../../../src/content-script/api/PrivateAPI'
import {StorageAdapter} from "../../../../src/content-script/storage/storageAdapter";
import {MemoryStorageAdapter} from "../../../../src/content-script/storage/memoryStorageAdapter";
import {WalletStoreSchema} from "../../../../src/content-script/storage/storageSchema";
import {WalletType} from "../../../../src/types/WalletType";
import hash from "hash.js";
import {decrypt, PrivateKey} from "eciesjs";
import {bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes} from "../../../../src/utils";

describe('create wallet', () => {
  let privateAPI: PrivateAPI
  let privateAPIClient: PrivateAPIClient
  let storage: StorageAdapter
  let secretKey: PrivateKey

  beforeEach(async () => {
    const sdk = new DashPlatformSDK()
    const memoryStorageAdapter = new MemoryStorageAdapter()

    storage = memoryStorageAdapter
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

    const {walletId} = await privateAPIClient.createWallet(WalletType.seedphrase, mnemonic)

    const expectedWallet: WalletStoreSchema = {
        walletId,
        network: 'testnet',
        walletType: 'seedphrase',
        label: null,
        encryptedMnemonic: null
    }

    const storageKey = `wallet_testnet_${walletId}`

    const walletStoreSchema = await storage.get(storageKey) as WalletStoreSchema

    expect(walletStoreSchema.walletId).toEqual(expectedWallet.walletId)
    expect(walletStoreSchema.network).toEqual(expectedWallet.network)
    expect(walletStoreSchema.walletType).toEqual(expectedWallet.walletType)
    expect(walletStoreSchema.label).toEqual(expectedWallet.label)

    expect(bytesToUtf8(decrypt(secretKey.toHex(), hexToBytes(walletStoreSchema.encryptedMnemonic!)))).toEqual(mnemonic)
  })

  test('should create a keystore wallet', async () => {
    const {walletId} = await privateAPIClient.createWallet(WalletType.keystore)

    const expectedWallet: WalletStoreSchema = {
        walletId,
        network: 'testnet',
        walletType: 'keystore',
        label: null,
        encryptedMnemonic: null
    }

    const storageKey = `wallet_testnet_${walletId}`

    const walletStoreSchema = await storage.get(storageKey) as WalletStoreSchema

    expect(walletStoreSchema).toStrictEqual(expectedWallet)
  })
})
