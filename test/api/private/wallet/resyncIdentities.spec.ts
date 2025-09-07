import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateAPIClient, WalletType } from '../../../../src/types'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import { IdentitiesStoreSchema, IdentityStoreSchema } from '../../../../src/content-script/storage/storageSchema'
import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import runMigrations from '../../../../src/content-script/storage/runMigrations'

describe('resync identities', () => {
  let privateAPI: PrivateAPI
  let privateAPIClient: PrivateAPIClient
  let storage: StorageAdapter
  let secretKey: PrivateKey
  let mnemonic: string

  beforeAll(async () => {
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

    await storage.set('passwordPublicKey', passwordPublicKey)

    await privateAPIClient.switchNetwork('testnet')
  })

  test('should resync identities with mnemonic', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.seedphrase, mnemonic)

    await privateAPIClient.switchWallet(walletId)

    const mockIdentities: IdentityStoreSchema[] = [{ index: 0, identifier: '1', label: null }, { index: 1, identifier: '2', label: null }, { index: 3, identifier: '3', label: null }]

    await storage.set(`identities_testnet_${walletId}`, { 1: mockIdentities[0], 2: mockIdentities[1], 3: mockIdentities[2] })

    const { identitiesCount } = await privateAPIClient.resyncIdentities(undefined, mnemonic)

    const storageKey = `identities_testnet_${walletId}`

    const expectedIdentities = [
      {
        index: 0,
        identifier: '2MfmHqYmAk1jAQNv7SsGJPT22MrfKFcHKZDc7cTu2biX',
        label: null
      },
      {
        index: 1,
        identifier: 'Y6WwZ3LYETZjsekjWjoZWnSBu9o5P5MD4Z3HmVGJiYt',
        label: null
      },
      {
        index: 2,
        identifier: 'D18qqAPmwRmCEQaLjaZMpjcbeNmuCcvV9ZFeNYs4jmTe',
        label: null
      },
      {
        index: 3,
        identifier: '64n4ccx4zmCyuCqaHp7yX2P3S3oqEkHaAK3m5VMPpbBj',
        label: null
      },
      {
        index: 4,
        identifier: 'BrJUt5g7Z2bsAXZUWcLUT1DX4KuQhG6VPB71RjiLE6b2',
        label: null
      }
    ]

    const expectedIdentitiesStoreSchema: IdentitiesStoreSchema = {
      '2MfmHqYmAk1jAQNv7SsGJPT22MrfKFcHKZDc7cTu2biX': expectedIdentities[0],
      Y6WwZ3LYETZjsekjWjoZWnSBu9o5P5MD4Z3HmVGJiYt: expectedIdentities[1],
      D18qqAPmwRmCEQaLjaZMpjcbeNmuCcvV9ZFeNYs4jmTe: expectedIdentities[2],
      '64n4ccx4zmCyuCqaHp7yX2P3S3oqEkHaAK3m5VMPpbBj': expectedIdentities[3],
      BrJUt5g7Z2bsAXZUWcLUT1DX4KuQhG6VPB71RjiLE6b2: expectedIdentities[4]
    }

    const identitiesStoreSchema = await storage.get(storageKey) as IdentitiesStoreSchema

    expect(identitiesCount).toEqual(5)
    expect(expectedIdentitiesStoreSchema).toStrictEqual(identitiesStoreSchema)
  })

  test('should resync identities with password', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.seedphrase, mnemonic)

    await privateAPIClient.switchWallet(walletId)

    const mockIdentities: IdentityStoreSchema[] = [{ index: 0, identifier: '1', label: null }, { index: 1, identifier: '2', label: null }, { index: 3, identifier: '3', label: null }]

    await storage.set(`identities_testnet_${walletId}`, { 1: mockIdentities[0], 2: mockIdentities[1], 3: mockIdentities[2] })

    const { identitiesCount } = await privateAPIClient.resyncIdentities('test')

    const storageKey = `identities_testnet_${walletId}`

    const expectedIdentities = [
      {
        index: 0,
        identifier: '2MfmHqYmAk1jAQNv7SsGJPT22MrfKFcHKZDc7cTu2biX',
        label: null
      },
      {
        index: 1,
        identifier: 'Y6WwZ3LYETZjsekjWjoZWnSBu9o5P5MD4Z3HmVGJiYt',
        label: null
      },
      {
        index: 2,
        identifier: 'D18qqAPmwRmCEQaLjaZMpjcbeNmuCcvV9ZFeNYs4jmTe',
        label: null
      },
      {
        index: 3,
        identifier: '64n4ccx4zmCyuCqaHp7yX2P3S3oqEkHaAK3m5VMPpbBj',
        label: null
      },
      {
        index: 4,
        identifier: 'BrJUt5g7Z2bsAXZUWcLUT1DX4KuQhG6VPB71RjiLE6b2',
        label: null
      }
    ]

    const expectedIdentitiesStoreSchema: IdentitiesStoreSchema = {
      '2MfmHqYmAk1jAQNv7SsGJPT22MrfKFcHKZDc7cTu2biX': expectedIdentities[0],
      Y6WwZ3LYETZjsekjWjoZWnSBu9o5P5MD4Z3HmVGJiYt: expectedIdentities[1],
      D18qqAPmwRmCEQaLjaZMpjcbeNmuCcvV9ZFeNYs4jmTe: expectedIdentities[2],
      '64n4ccx4zmCyuCqaHp7yX2P3S3oqEkHaAK3m5VMPpbBj': expectedIdentities[3],
      BrJUt5g7Z2bsAXZUWcLUT1DX4KuQhG6VPB71RjiLE6b2: expectedIdentities[4]
    }

    const identitiesStoreSchema = await storage.get(storageKey) as IdentitiesStoreSchema

    expect(identitiesCount).toEqual(5)
    expect(expectedIdentitiesStoreSchema).toStrictEqual(identitiesStoreSchema)
  })
})
