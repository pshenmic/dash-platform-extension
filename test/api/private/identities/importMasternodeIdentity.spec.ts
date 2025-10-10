import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKey } from 'eciesjs'
import hash from 'hash.js'
import { PrivateAPIClient, WalletType } from '../../../../src/types'
import { PrivateAPI } from '../../../../src/content-script/api/PrivateAPI'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import { IdentitiesStoreSchema, KeyPairsSchema } from '../../../../src/content-script/storage/storageSchema'
import runMigrations from '../../../../src/content-script/storage/runMigrations'
import { PrivateKeyWASM } from 'pshenmic-dpp'

describe('switch identity', () => {
  let privateAPI: PrivateAPI
  let privateAPIClient: PrivateAPIClient
  let sdk: DashPlatformSDK
  let storage: StorageAdapter
  let secretKey: PrivateKey

  beforeEach(async () => {
    sdk = new DashPlatformSDK({ network: 'testnet' })
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

  test('should import identity masternode identity with only owner key', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)
    await storage.set('currentWalletId', walletId)

    const proTxHash = '143dcd6a6b7684fde01e88a10e5d65de9a29244c5ecd586d14a342657025f113'
    const ownerPrivateKey = PrivateKeyWASM.fromWIF('cSwpp87Ck1LxwUfFywNAG3QRkd6rW4L5JeT2RdNebPAz2hivpNnP')

    await privateAPIClient.importMasternodeIdentity(proTxHash, ownerPrivateKey.hex())

    const masternodeIdentifier = sdk.utils.createMasternodeIdentifier(proTxHash)
    const voterIdentifier = await sdk.utils.createVoterIdentifier(proTxHash, ownerPrivateKey.getPublicKeyHash())

    const identitiesStoreSchema = await storage.get(`identities_testnet_${walletId}`) as IdentitiesStoreSchema

    expect(Object.keys(identitiesStoreSchema).length).toBe(2)
    expect(identitiesStoreSchema[masternodeIdentifier.base58()]).toBeDefined()
    expect(identitiesStoreSchema[voterIdentifier.base58()]).toBeDefined()

    const keyPairStoreSchema = await storage.get(`keyPairs_testnet_${walletId}`) as KeyPairsSchema

    expect(keyPairStoreSchema[masternodeIdentifier.base58()].length).toBe(1)
    expect(keyPairStoreSchema[voterIdentifier.base58()].length).toBe(1)
  })

  test('should import identity masternode identity with all different private keys', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)
    await storage.set('currentWalletId', walletId)

    const proTxHash = '621ef9f7bf58a1695b95fc469c0c774121ff8e4a1c82e2b0580ca9d11ea47c7e'
    const ownerPrivateKey = PrivateKeyWASM.fromWIF('cTb2RmnQ55J6fF43zE9sUoDqvJgPL47UQPPzLFgezqkLnofXQPDF')
    const votingPrivateKey = PrivateKeyWASM.fromWIF('cP7TdRD3WPyyLpmgVjovSFw3sRJHfr6iXptbM2SpRpgwgKUvZhyK')
    const payoutPrivateKey = PrivateKeyWASM.fromWIF('cU3a6U7eY4ssspsNNcyQRkJnDULXE1BZRAh6D4DRXYgg3k9Aifmp')

    await privateAPIClient.importMasternodeIdentity(proTxHash, ownerPrivateKey.hex(), votingPrivateKey.hex(), payoutPrivateKey.hex())

    const masternodeIdentifier = sdk.utils.createMasternodeIdentifier(proTxHash)
    const voterIdentifier = await sdk.utils.createVoterIdentifier(proTxHash, votingPrivateKey.getPublicKeyHash())

    const identitiesStoreSchema = await storage.get(`identities_testnet_${walletId}`) as IdentitiesStoreSchema

    expect(Object.keys(identitiesStoreSchema).length).toBe(2)
    expect(identitiesStoreSchema[masternodeIdentifier.base58()]).toBeDefined()
    expect(identitiesStoreSchema[voterIdentifier.base58()]).toBeDefined()

    const keyPairStoreSchema = await storage.get(`keyPairs_testnet_${walletId}`) as KeyPairsSchema

    expect(keyPairStoreSchema[masternodeIdentifier.base58()].length).toBe(2)
    expect(keyPairStoreSchema[voterIdentifier.base58()].length).toBe(1)
  })

  test('should import identity masternode identity with voting and payout addresses', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)
    await storage.set('currentWalletId', walletId)

    const proTxHash = '621ef9f7bf58a1695b95fc469c0c774121ff8e4a1c82e2b0580ca9d11ea47c7e'
    const votingPrivateKey = PrivateKeyWASM.fromWIF('cP7TdRD3WPyyLpmgVjovSFw3sRJHfr6iXptbM2SpRpgwgKUvZhyK')
    const payoutPrivateKey = PrivateKeyWASM.fromWIF('cU3a6U7eY4ssspsNNcyQRkJnDULXE1BZRAh6D4DRXYgg3k9Aifmp')

    await privateAPIClient.importMasternodeIdentity(proTxHash, undefined, votingPrivateKey.hex(), payoutPrivateKey.hex())

    const masternodeIdentifier = sdk.utils.createMasternodeIdentifier(proTxHash)
    const voterIdentifier = await sdk.utils.createVoterIdentifier(proTxHash, votingPrivateKey.getPublicKeyHash())

    const identitiesStoreSchema = await storage.get(`identities_testnet_${walletId}`) as IdentitiesStoreSchema

    expect(Object.keys(identitiesStoreSchema).length).toBe(2)
    expect(identitiesStoreSchema[masternodeIdentifier.base58()]).toBeDefined()
    expect(identitiesStoreSchema[voterIdentifier.base58()]).toBeDefined()

    const keyPairStoreSchema = await storage.get(`keyPairs_testnet_${walletId}`) as KeyPairsSchema

    expect(keyPairStoreSchema[masternodeIdentifier.base58()].length).toBe(1)
    expect(keyPairStoreSchema[voterIdentifier.base58()].length).toBe(1)
  })

  test('should import identity masternode identity with same owner and voting addresses', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)
    await storage.set('currentWalletId', walletId)

    const proTxHash = '143dcd6a6b7684fde01e88a10e5d65de9a29244c5ecd586d14a342657025f113'
    const ownerPrivateKey = PrivateKeyWASM.fromWIF('cSwpp87Ck1LxwUfFywNAG3QRkd6rW4L5JeT2RdNebPAz2hivpNnP')

    await privateAPIClient.importMasternodeIdentity(proTxHash, ownerPrivateKey.hex(), ownerPrivateKey.hex())

    const masternodeIdentifier = sdk.utils.createMasternodeIdentifier(proTxHash)
    const voterIdentifier = await sdk.utils.createVoterIdentifier(proTxHash, ownerPrivateKey.getPublicKeyHash())

    const identitiesStoreSchema = await storage.get(`identities_testnet_${walletId}`) as IdentitiesStoreSchema

    expect(Object.keys(identitiesStoreSchema).length).toBe(2)
    expect(identitiesStoreSchema[masternodeIdentifier.base58()]).toBeDefined()
    expect(identitiesStoreSchema[voterIdentifier.base58()]).toBeDefined()

    const keyPairStoreSchema = await storage.get(`keyPairs_testnet_${walletId}`) as KeyPairsSchema

    expect(keyPairStoreSchema[masternodeIdentifier.base58()].length).toBe(1)
    expect(keyPairStoreSchema[voterIdentifier.base58()].length).toBe(1)
  })

  test('should import identity masternode identity with only voting addresses', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)
    await storage.set('currentWalletId', walletId)

    const proTxHash = '621ef9f7bf58a1695b95fc469c0c774121ff8e4a1c82e2b0580ca9d11ea47c7e'
    const votingPrivateKey = PrivateKeyWASM.fromWIF('cP7TdRD3WPyyLpmgVjovSFw3sRJHfr6iXptbM2SpRpgwgKUvZhyK')

    await privateAPIClient.importMasternodeIdentity(proTxHash, undefined, votingPrivateKey.hex(), undefined)

    const voterIdentifier = await sdk.utils.createVoterIdentifier(proTxHash, votingPrivateKey.getPublicKeyHash())

    const identitiesStoreSchema = await storage.get(`identities_testnet_${walletId}`) as IdentitiesStoreSchema

    expect(Object.keys(identitiesStoreSchema).length).toBe(1)
    expect(identitiesStoreSchema[voterIdentifier.base58()]).toBeDefined()

    const keyPairStoreSchema = await storage.get(`keyPairs_testnet_${walletId}`) as KeyPairsSchema

    expect(keyPairStoreSchema[voterIdentifier.base58()].length).toBe(1)
  })

  test('should import identity masternode identity with only payout addresses', async () => {
    const { walletId } = await privateAPIClient.createWallet(WalletType.keystore)
    await storage.set('currentWalletId', walletId)

    const proTxHash = '621ef9f7bf58a1695b95fc469c0c774121ff8e4a1c82e2b0580ca9d11ea47c7e'
    const payoutPrivateKey = PrivateKeyWASM.fromWIF('cU3a6U7eY4ssspsNNcyQRkJnDULXE1BZRAh6D4DRXYgg3k9Aifmp')

    await privateAPIClient.importMasternodeIdentity(proTxHash, undefined, undefined, payoutPrivateKey.hex())

    const masternodeIdentifier = sdk.utils.createMasternodeIdentifier(proTxHash)

    const identitiesStoreSchema = await storage.get(`identities_testnet_${walletId}`) as IdentitiesStoreSchema

    expect(Object.keys(identitiesStoreSchema).length).toBe(1)
    expect(identitiesStoreSchema[masternodeIdentifier.base58()]).toBeDefined()

    const keyPairStoreSchema = await storage.get(`keyPairs_testnet_${walletId}`) as KeyPairsSchema

    expect(keyPairStoreSchema[masternodeIdentifier.base58()].length).toBe(1)
  })
})
