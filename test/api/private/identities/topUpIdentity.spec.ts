import { PrivateKey, encrypt } from 'eciesjs'
import hash from 'hash.js'
import { KeyType, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { TopUpIdentityHandler } from '../../../../src/content-script/api/private/identities/topUpIdentity'
import { RegisterIdentityHandler } from '../../../../src/content-script/api/private/identities/registerIdentity'
import { AssetLockFundingAddressesRepository } from '../../../../src/content-script/repository/AssetLockFundingAddressesRepository'
import { StorageAdapter } from '../../../../src/content-script/storage/storageAdapter'
import { bytesToHex, hexToBytes } from '../../../../src/utils'
import { buildAssetLockFromFundingTx } from '../../../../src/utils/buildAssetLockFromFundingTx'
import { waitForAssetLockProof } from '../../../../src/utils/waitForAssetLockProof'
import { WalletType } from '../../../../src/types'
import { IdentityType } from '../../../../src/types/enums/IdentityType'

jest.mock('../../../../src/utils/buildAssetLockFromFundingTx', () => ({
  buildAssetLockFromFundingTx: jest.fn()
}))

jest.mock('../../../../src/utils/waitForAssetLockProof', () => ({
  waitForAssetLockProof: jest.fn()
}))

const buildAssetLockFromFundingTxMock = buildAssetLockFromFundingTx as jest.MockedFunction<typeof buildAssetLockFromFundingTx>
const waitForAssetLockProofMock = waitForAssetLockProof as jest.MockedFunction<typeof waitForAssetLockProof>

class TestStorageAdapter implements StorageAdapter {
  cache: Record<string, object | number | string | null> = {}

  async getAll (): Promise<object> {
    return this.cache
  }

  async get (key: string): Promise<object | number | string | null> {
    return this.cache[key] ?? null
  }

  async set (key: string, value: object | number | string | null): Promise<void> {
    this.cache[key] = value
  }

  async remove (key: string): Promise<void> {
    this.cache[key] = null
  }
}

describe('TopUpIdentityHandler', () => {
  const identityId = 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'
  const otherIdentityId = 'B7kcE1juMBWEWkuYRJhVdAE2e6RaevrGxRsa1DrLCpQH'
  const assetLockFundingAddress = 'yZPSYxHnNEc6TyZJx6AUrHkAZJcFgp5H9j'
  const assetLockFundingTxid = 'a'.repeat(64)
  const assetLockTxid = 'b'.repeat(64)
  const password = 'test'
  const assetLockProof = {
    type: 'instantLock',
    transaction: 'transaction',
    instantLock: 'instantLock',
    outputIndex: 0
  }

  let order: string[]
  let assetLockTx: any
  let stateTransition: any
  let walletRepository: any
  let identitiesRepository: any
  let assetLockFundingAddressesRepository: any
  let coreSDK: any
  let sdk: any
  let handler: TopUpIdentityHandler
  let encryptedPrivateKey: string

  beforeEach(() => {
    jest.clearAllMocks()

    order = []

    const fundingPrivateKey = PrivateKeyWASM.fromHex('3ca33236ab14f6df6cf87fcbb0551544fee7dcf4f251557af02c175725764a5a', 'testnet')
    const passwordHash = hash.sha256().update(password).digest('hex')
    const secretKey = PrivateKey.fromHex(passwordHash)
    encryptedPrivateKey = bytesToHex(encrypt(secretKey.publicKey.toHex(), hexToBytes(fundingPrivateKey.hex())))

    assetLockTx = {
      hash: jest.fn(() => assetLockTxid),
      bytes: jest.fn(() => new Uint8Array([1, 2, 3]))
    }

    stateTransition = {
      signByPrivateKey: jest.fn(),
      hash: jest.fn(() => 'stateTransitionHash')
    }

    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1',
        type: WalletType.keystore,
        network: 'testnet',
        label: null,
        encryptedMnemonic: null,
        seedHash: null,
        currentIdentity: identityId
      }))
    }

    identitiesRepository = {
      getByIdentifier: jest.fn(async () => ({
        identifier: identityId,
        index: 0,
        label: null,
        proTxHash: null,
        type: IdentityType.regular
      }))
    }

    assetLockFundingAddressesRepository = {
      getByAddress: jest.fn(async () => ({
        address: assetLockFundingAddress,
        encryptedPrivateKey,
        used: false,
        claimedForIdentityId: null
      })),
      markAsClaimed: jest.fn(async () => {
        order.push('claim')
      }),
      markAsUsed: jest.fn(async () => {
        order.push('markUsed')
      })
    }

    coreSDK = {
      subscribeToTransactions: jest.fn(() => {
        order.push('subscribe')
        return { close: jest.fn() }
      }),
      broadcastTransaction: jest.fn(async () => {
        order.push('l1Broadcast')
      })
    }

    sdk = {
      identities: {
        createStateTransition: jest.fn(() => stateTransition)
      },
      stateTransitions: {
        broadcast: jest.fn(async () => {
          order.push('platformBroadcast')
        }),
        waitForStateTransitionResult: jest.fn(async () => {
          order.push('platformWait')
        })
      }
    }

    buildAssetLockFromFundingTxMock.mockImplementation(async () => {
      order.push('build')
      return { assetLockTx } as any
    })

    waitForAssetLockProofMock.mockImplementation(async () => {
      order.push('waitProof')
      return assetLockProof as any
    })

    handler = new TopUpIdentityHandler(
      walletRepository,
      identitiesRepository,
      assetLockFundingAddressesRepository,
      sdk,
      coreSDK
    )
  })

  const handle = async (): Promise<any> => {
    return await handler.handle({
      context: 'dash-platform-extension',
      id: 'id',
      method: 'TOP_UP_IDENTITY',
      type: 'request',
      payload: {
        identityId,
        assetLockFundingAddress,
        assetLockFundingTxid,
        password
      }
    })
  }

  test('tops up identity using instant-lock asset-lock proof', async () => {
    const result = await handle()

    expect(result).toEqual({
      identityId,
      stateTransitionHash: 'stateTransitionHash'
    })

    expect(buildAssetLockFromFundingTxMock).toHaveBeenCalledWith(
      coreSDK,
      assetLockFundingTxid,
      assetLockFundingAddress,
      expect.any(String)
    )
    expect(sdk.identities.createStateTransition).toHaveBeenCalledWith('topUp', {
      identityId,
      assetLockProof
    })
    expect(stateTransition.signByPrivateKey).toHaveBeenCalledTimes(1)
    expect(stateTransition.signByPrivateKey).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
      KeyType.ECDSA_SECP256K1
    )
    expect(coreSDK.broadcastTransaction).toHaveBeenCalledWith(assetLockTx.bytes())
    expect(sdk.stateTransitions.broadcast).toHaveBeenCalledWith(stateTransition)
    expect(sdk.stateTransitions.waitForStateTransitionResult).toHaveBeenCalledWith(stateTransition)
    expect(order).toEqual([
      'build',
      'claim',
      'subscribe',
      'l1Broadcast',
      'waitProof',
      'platformBroadcast',
      'platformWait',
      'markUsed'
    ])
  })

  test('rejects identity that does not belong to current wallet', async () => {
    identitiesRepository.getByIdentifier.mockResolvedValueOnce(null)

    await expect(handle()).rejects.toThrow(`Identity ${identityId} does not belong to the current wallet`)

    expect(assetLockFundingAddressesRepository.markAsClaimed).not.toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    expect(sdk.stateTransitions.broadcast).not.toHaveBeenCalled()
  })

  test('rejects missing funding address', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValueOnce(null)

    await expect(handle()).rejects.toThrow(`Asset lock funding address ${assetLockFundingAddress} not found`)

    expect(assetLockFundingAddressesRepository.markAsClaimed).not.toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  test('rejects used funding address', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValueOnce({
      address: assetLockFundingAddress,
      encryptedPrivateKey,
      used: true,
      claimedForIdentityId: null
    })

    await expect(handle()).rejects.toThrow(`Asset lock funding address ${assetLockFundingAddress} has already been used`)

    expect(assetLockFundingAddressesRepository.markAsClaimed).not.toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  test('rejects funding address claimed for another identity', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValueOnce({
      address: assetLockFundingAddress,
      encryptedPrivateKey,
      used: false,
      claimedForIdentityId: otherIdentityId
    })

    await expect(handle()).rejects.toThrow(
      `Asset lock funding address ${assetLockFundingAddress} is already claimed for identity ${otherIdentityId}`
    )

    expect(buildAssetLockFromFundingTxMock).not.toHaveBeenCalled()
    expect(assetLockFundingAddressesRepository.markAsClaimed).not.toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  test('rejects wrong password without claiming or broadcasting', async () => {
    await expect(handler.handle({
      context: 'dash-platform-extension',
      id: 'id',
      method: 'TOP_UP_IDENTITY',
      type: 'request',
      payload: {
        identityId,
        assetLockFundingAddress,
        assetLockFundingTxid,
        password: 'wrong'
      }
    })).rejects.toThrow('Failed to decrypt asset lock funding key - wrong password or corrupted entry')

    expect(assetLockFundingAddressesRepository.markAsClaimed).not.toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  test('does not claim when asset-lock tx build fails', async () => {
    const error = new Error('bad funding tx')
    buildAssetLockFromFundingTxMock.mockRejectedValueOnce(error)

    await expect(handle()).rejects.toThrow(error)

    expect(assetLockFundingAddressesRepository.markAsClaimed).not.toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  test('treats idempotent platform error as success and marks used', async () => {
    sdk.stateTransitions.waitForStateTransitionResult.mockRejectedValueOnce(
      new Error(`Asset lock transaction ${assetLockTxid} output 0 already completely used`)
    )

    const result = await handle()

    expect(result).toEqual({
      identityId,
      stateTransitionHash: 'stateTransitionHash'
    })
    expect(assetLockFundingAddressesRepository.markAsUsed).toHaveBeenCalledWith(assetLockFundingAddress)
  })

  test('treats idempotent state transition error from broadcast as success', async () => {
    sdk.stateTransitions.broadcast.mockRejectedValueOnce(
      new Error('Object already exists: state transition already in chain')
    )

    const result = await handle()

    expect(result).toEqual({
      identityId,
      stateTransitionHash: 'stateTransitionHash'
    })
    expect(assetLockFundingAddressesRepository.markAsUsed).toHaveBeenCalledWith(assetLockFundingAddress)
    expect(sdk.stateTransitions.waitForStateTransitionResult).not.toHaveBeenCalled()
  })

  test('propagates non-idempotent platform error without marking used', async () => {
    sdk.stateTransitions.broadcast.mockRejectedValueOnce(new Error('platform rejected transition'))

    await expect(handle()).rejects.toThrow('platform rejected transition')

    expect(assetLockFundingAddressesRepository.markAsClaimed).toHaveBeenCalledWith(assetLockFundingAddress, identityId)
    expect(assetLockFundingAddressesRepository.markAsUsed).not.toHaveBeenCalled()
  })
})

describe('RegisterIdentityHandler claimed funding guard', () => {
  test('rejects claimed funding address before L1 or Platform work', async () => {
    const assetLockFundingAddress = 'yZPSYxHnNEc6TyZJx6AUrHkAZJcFgp5H9j'
    const claimedForIdentityId = 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'
    const coreSDK = {
      broadcastTransaction: jest.fn()
    }
    const sdk = {
      identities: {
        getIdentityByPublicKeyHash: jest.fn(),
        getIdentityByNonUniquePublicKeyHash: jest.fn()
      },
      stateTransitions: {
        broadcast: jest.fn()
      }
    }
    const handler = new RegisterIdentityHandler(
      {
        getCurrent: jest.fn(async () => ({
          walletId: 'wallet1',
          type: WalletType.seedphrase,
          network: 'testnet',
          label: null,
          encryptedMnemonic: 'encryptedMnemonic',
          seedHash: 'seedHash',
          currentIdentity: null
        }))
      } as any,
      {
        getAll: jest.fn(async () => [])
      } as any,
      {
        getByAddress: jest.fn(async () => ({
          address: assetLockFundingAddress,
          encryptedPrivateKey: 'encryptedPrivateKey',
          used: false,
          claimedForIdentityId
        }))
      } as any,
      {} as any,
      sdk as any,
      coreSDK as any
    )

    await expect(handler.handle({
      context: 'dash-platform-extension',
      id: 'id',
      method: 'REGISTER_IDENTITY',
      type: 'request',
      payload: {
        assetLockFundingAddress,
        assetLockFundingTxid: 'a'.repeat(64),
        password: 'test'
      }
    })).rejects.toThrow(
      `Asset lock funding address ${assetLockFundingAddress} is already claimed for a pending top-up ` +
      `(identity ${claimedForIdentityId}) and cannot be used for registration`
    )

    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    expect(sdk.stateTransitions.broadcast).not.toHaveBeenCalled()
    expect(sdk.identities.getIdentityByPublicKeyHash).not.toHaveBeenCalled()
  })
})

describe('AssetLockFundingAddressesRepository top-up claim support', () => {
  const storageKey = 'assetLockFundingAddresses_testnet_wallet1'

  let storage: TestStorageAdapter
  let repository: AssetLockFundingAddressesRepository

  beforeEach(async () => {
    storage = new TestStorageAdapter()
    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', 'wallet1')
    repository = new AssetLockFundingAddressesRepository(storage)
  })

  test('findUnused skips claimed entries', async () => {
    await storage.set(storageKey, {
      claimed: {
        address: 'claimed',
        encryptedPrivateKey: 'encryptedPrivateKey',
        used: false,
        claimedForIdentityId: 'identity'
      },
      available: {
        address: 'available',
        encryptedPrivateKey: 'encryptedPrivateKey',
        used: false,
        claimedForIdentityId: null
      }
    })

    await expect(repository.findUnused()).resolves.toEqual({
      address: 'available',
      encryptedPrivateKey: 'encryptedPrivateKey',
      used: false,
      claimedForIdentityId: null
    })
  })

  test('markAsClaimed fails for missing entry', async () => {
    await storage.set(storageKey, {})

    await expect(repository.markAsClaimed('missing', 'identity')).rejects.toThrow(
      'Asset lock funding address missing not found'
    )
  })

  test('markAsClaimed fails for used entry', async () => {
    await storage.set(storageKey, {
      address: {
        address: 'address',
        encryptedPrivateKey: 'encryptedPrivateKey',
        used: true,
        claimedForIdentityId: null
      }
    })

    await expect(repository.markAsClaimed('address', 'identity')).rejects.toThrow(
      'Asset lock funding address address has already been used'
    )
  })

  test('markAsClaimed fails when claimed for another identity', async () => {
    await storage.set(storageKey, {
      address: {
        address: 'address',
        encryptedPrivateKey: 'encryptedPrivateKey',
        used: false,
        claimedForIdentityId: 'otherIdentity'
      }
    })

    await expect(repository.markAsClaimed('address', 'identity')).rejects.toThrow(
      'Asset lock funding address address is already claimed for identity otherIdentity'
    )
  })

  test('markAsClaimed is idempotent for the same identity', async () => {
    await storage.set(storageKey, {
      address: {
        address: 'address',
        encryptedPrivateKey: 'encryptedPrivateKey',
        used: false,
        claimedForIdentityId: 'identity'
      }
    })

    await repository.markAsClaimed('address', 'identity')

    await expect(storage.get(storageKey)).resolves.toEqual({
      address: {
        address: 'address',
        encryptedPrivateKey: 'encryptedPrivateKey',
        used: false,
        claimedForIdentityId: 'identity'
      }
    })
  })

  test('markAsClaimed claims unclaimed entry', async () => {
    await storage.set(storageKey, {
      address: {
        address: 'address',
        encryptedPrivateKey: 'encryptedPrivateKey',
        used: false
      }
    })

    await repository.markAsClaimed('address', 'identity')

    await expect(storage.get(storageKey)).resolves.toEqual({
      address: {
        address: 'address',
        encryptedPrivateKey: 'encryptedPrivateKey',
        used: false,
        claimedForIdentityId: 'identity'
      }
    })
  })

  test('markAsUsed preserves claimedForIdentityId', async () => {
    await storage.set(storageKey, {
      address: {
        address: 'address',
        encryptedPrivateKey: 'encryptedPrivateKey',
        used: false,
        claimedForIdentityId: 'identity'
      }
    })

    await repository.markAsUsed('address')

    await expect(storage.get(storageKey)).resolves.toEqual({
      address: {
        address: 'address',
        encryptedPrivateKey: 'encryptedPrivateKey',
        used: true,
        claimedForIdentityId: 'identity'
      }
    })
  })
})
