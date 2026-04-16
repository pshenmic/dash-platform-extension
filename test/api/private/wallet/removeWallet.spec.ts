import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateAPIClient, WalletType } from '../../../../src/types'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import {
  AppConnectsStorageSchema,
  IdentitiesStoreSchema,
  KeyPairsSchema,
  StateTransitionsStoreSchema
} from '../../../../src/content-script/storage/storageSchema'
import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import runMigrations from '../../../../src/content-script/storage/runMigrations'
import { AppConnectStatus } from '../../../../src/types/enums/AppConnectStatus'
import { StateTransitionStatus } from '../../../../src/types/enums/StateTransitionStatus'

describe('remove wallet', () => {
  let privateAPI: PrivateAPI
  let privateAPIClient: PrivateAPIClient
  let storage: StorageAdapter

  const password = 'test'

  beforeEach(async () => {
    const sdk = new DashPlatformSDK({ network: 'testnet' })
    const memoryStorageAdapter = new MemoryStorageAdapter()

    storage = memoryStorageAdapter
    await runMigrations(storage)

    privateAPI = new PrivateAPI(sdk, {} as any, memoryStorageAdapter)
    privateAPIClient = new PrivateAPIClient()

    privateAPI.init()

    const passwordHash = hash.sha256().update(password).digest('hex')
    const secretKey = PrivateKey.fromHex(passwordHash)
    const passwordPublicKey = secretKey.publicKey.toHex()

    await storage.set('network', 'testnet')
    await storage.set('passwordPublicKey', passwordPublicKey)
  })

  test('should remove a keystore wallet and all associated storage', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await storage.set('currentWalletId', walletId)

    const mockIdentities: IdentitiesStoreSchema = {
      J6toeWxpVqqgL8H21mAsLzcM6Sf8cPbzTqYoX7GsrzRj: {
        index: 0,
        label: null,
        identifier: 'J6toeWxpVqqgL8H21mAsLzcM6Sf8cPbzTqYoX7GsrzRj',
        proTxHash: null,
        type: 'user'
      }
    }

    const mockKeyPairs: KeyPairsSchema = {
      J6toeWxpVqqgL8H21mAsLzcM6Sf8cPbzTqYoX7GsrzRj: [
        { keyId: 0, pending: false, encryptedPrivateKey: 'aabbcc' }
      ]
    }

    const mockStateTransitions: StateTransitionsStoreSchema = {
      abc123: {
        unsignedHash: 'abc123',
        signedHash: null,
        unsigned: 'dGVzdA==',
        signature: null,
        signaturePublicKeyId: null,
        status: StateTransitionStatus.pending,
        error: null
      }
    }

    const mockAppConnects: AppConnectsStorageSchema = {
      mockId1: { id: 'mockId1', url: 'http://localhost:8080', status: AppConnectStatus.approved }
    }

    await storage.set(`identities_testnet_${walletId}`, mockIdentities)
    await storage.set(`keyPairs_testnet_${walletId}`, mockKeyPairs)
    await storage.set(`stateTransitions_testnet_${walletId}`, mockStateTransitions)
    await storage.set(`appConnects_testnet_${walletId}`, mockAppConnects)

    await privateAPIClient.removeWallet(walletId, password)

    expect(await storage.get(`wallet_testnet_${walletId}`)).toBeNull()
    expect(await storage.get(`identities_testnet_${walletId}`)).toBeNull()
    expect(await storage.get(`keyPairs_testnet_${walletId}`)).toBeNull()
    expect(await storage.get(`stateTransitions_testnet_${walletId}`)).toBeNull()
    expect(await storage.get(`appConnects_testnet_${walletId}`)).toBeNull()

    const wallets = await storage.get('wallets') as string[]
    expect(wallets).not.toContain(walletId)
  })

  test('should remove a seedphrase wallet and not touch keyPairs storage', async () => {
    const mnemonic = 'frequent situate velvet inform help family salad park torch zero chapter right'
    const { walletId } = await privateAPIClient.createWallet(WalletType.seedphrase, mnemonic)

    await storage.set('currentWalletId', walletId)

    const mockKeyPairs: KeyPairsSchema = {
      someIdentity: [{ keyId: 0, pending: false, encryptedPrivateKey: 'aabbcc' }]
    }

    await storage.set(`keyPairs_testnet_${walletId}`, mockKeyPairs)

    await privateAPIClient.removeWallet(walletId, password)

    expect(await storage.get(`wallet_testnet_${walletId}`)).toBeNull()

    // keyPairs should NOT be removed for seedphrase wallets
    expect(await storage.get(`keyPairs_testnet_${walletId}`)).not.toBeNull()

    const wallets = await storage.get('wallets') as string[]
    expect(wallets).not.toContain(walletId)
  })

  test('should clear currentWalletId when removing the current wallet', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await storage.set('currentWalletId', walletId)

    await privateAPIClient.removeWallet(walletId, password)

    expect(await storage.get('currentWalletId')).toBeNull()
  })

  test('should not clear currentWalletId when removing a different wallet', async () => {
    const { walletId: firstWalletId } = await privateAPIClient.createWallet(WalletType.keystore)
    const { walletId: secondWalletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await storage.set('currentWalletId', firstWalletId)

    await privateAPIClient.removeWallet(secondWalletId, password)

    expect(await storage.get('currentWalletId')).toEqual(firstWalletId)
  })

  test('should throw an error when password is invalid', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)

    await storage.set('currentWalletId', walletId)

    await expect(privateAPIClient.removeWallet(walletId, 'wrongpassword'))
      .rejects.toThrow('Invalid password')

    expect(await storage.get(`wallet_testnet_${walletId}`)).not.toBeNull()
  })

  test('should throw an error when wallet does not exist', async () => {
    const nonExistentWalletId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

    await expect(privateAPIClient.removeWallet(nonExistentWalletId, password))
      .rejects.toThrow(`Could not find wallet ${nonExistentWalletId}`)
  })
})
