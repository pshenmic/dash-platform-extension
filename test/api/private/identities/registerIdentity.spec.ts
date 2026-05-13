import { PrivateKey, encrypt } from 'eciesjs'
import hash from 'hash.js'
import { PrivateKeyWASM } from 'dash-platform-sdk/types'
import { RegisterIdentityHandler } from '../../../../src/content-script/api/private/identities/registerIdentity'
import { AssetLockFundingAddressesRepository } from '../../../../src/content-script/repository/AssetLockFundingAddressesRepository'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import { bytesToHex, hexToBytes } from '../../../../src/utils'
import { buildAssetLockFromFundingTx } from '../../../../src/utils/buildAssetLockFromFundingTx'
import { waitForAssetLockProof } from '../../../../src/utils/waitForAssetLockProof'
import { WalletType } from '../../../../src/types'

jest.mock('../../../../src/utils/buildAssetLockFromFundingTx', () => ({
  buildAssetLockFromFundingTx: jest.fn()
}))

jest.mock('../../../../src/utils/waitForAssetLockProof', () => ({
  waitForAssetLockProof: jest.fn()
}))

jest.mock('../../../../src/utils/identityRegistration', () => ({
  IDENTITY_KEY_DEFINITIONS: [{ id: 0 }],
  buildIdentityCreateTransition: jest.fn()
}))

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    deriveIdentityPrivateKey: jest.fn()
  }
})

const buildAssetLockFromFundingTxMock = buildAssetLockFromFundingTx as jest.MockedFunction<typeof buildAssetLockFromFundingTx>
const waitForAssetLockProofMock = waitForAssetLockProof as jest.MockedFunction<typeof waitForAssetLockProof>

const { buildIdentityCreateTransition } = jest.requireMock('../../../../src/utils/identityRegistration')
const { deriveIdentityPrivateKey } = jest.requireMock('../../../../src/utils')

describe('RegisterIdentityHandler', () => {
  const identifier = 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'
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
  let handler: RegisterIdentityHandler
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
      getOwnerId: jest.fn(() => ({ base58: () => identifier })),
      hash: jest.fn(() => 'stateTransitionHash')
    }

    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1',
        type: WalletType.seedphrase,
        network: 'testnet',
        label: null,
        encryptedMnemonic: 'encryptedMnemonic',
        seedHash: 'seedHash',
        currentIdentity: null
      })),
      switchIdentity: jest.fn(async () => {
        order.push('switchIdentity')
      })
    }

    identitiesRepository = {
      getAll: jest.fn(async () => []),
      getByIdentifier: jest.fn(async () => null),
      create: jest.fn(async () => {
        order.push('identityCreate')
      }),
      remove: jest.fn(async () => {
        order.push('identityRemove')
      })
    }

    assetLockFundingAddressesRepository = {
      getByAddress: jest.fn(async () => ({
        address: assetLockFundingAddress,
        encryptedPrivateKey,
        used: false,
        assetLockTxid: null
      })),
      markAsBroadcasted: jest.fn(async () => {
        order.push('markBroadcasted')
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
        getIdentityByPublicKeyHash: jest.fn(async () => null),
        getIdentityByNonUniquePublicKeyHash: jest.fn(async () => null)
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

    deriveIdentityPrivateKey.mockImplementation(async () => {
      return PrivateKeyWASM.fromHex('3ca33236ab14f6df6cf87fcbb0551544fee7dcf4f251557af02c175725764a5a', 'testnet')
    })

    buildIdentityCreateTransition.mockImplementation(() => stateTransition)

    handler = new RegisterIdentityHandler(
      walletRepository,
      identitiesRepository,
      assetLockFundingAddressesRepository,
      {} as any,
      sdk,
      coreSDK
    )
  })

  const handle = async (): Promise<any> => {
    return await handler.handle({
      context: 'dash-platform-extension',
      id: 'id',
      method: 'REGISTER_IDENTITY',
      type: 'request',
      payload: {
        assetLockFundingAddress,
        assetLockFundingTxid,
        password
      }
    })
  }

  test('registers identity with full happy-path flow', async () => {
    const result = await handle()

    expect(result).toEqual({
      identifier,
      stateTransitionHash: 'stateTransitionHash'
    })

    expect(coreSDK.broadcastTransaction).toHaveBeenCalledWith(assetLockTx.bytes())
    expect(assetLockFundingAddressesRepository.markAsBroadcasted).toHaveBeenCalledWith(
      assetLockFundingAddress,
      assetLockTxid
    )
    expect(identitiesRepository.create).toHaveBeenCalledWith(identifier, 'regular', 0)
    expect(sdk.stateTransitions.broadcast).toHaveBeenCalledWith(stateTransition)
    expect(sdk.stateTransitions.waitForStateTransitionResult).toHaveBeenCalledWith(stateTransition)
    expect(assetLockFundingAddressesRepository.markAsUsed).toHaveBeenCalledWith(assetLockFundingAddress)
    expect(walletRepository.switchIdentity).toHaveBeenCalledWith(identifier)
    expect(identitiesRepository.remove).not.toHaveBeenCalled()

    expect(order).toEqual([
      'build',
      'subscribe',
      'l1Broadcast',
      'markBroadcasted',
      'waitProof',
      'identityCreate',
      'platformBroadcast',
      'platformWait',
      'markUsed',
      'switchIdentity'
    ])
  })

  test('skips Core broadcast on recovery when assetLockTxid already saved', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValueOnce({
      address: assetLockFundingAddress,
      encryptedPrivateKey,
      used: false,
      assetLockTxid
    })

    await handle()

    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    expect(assetLockFundingAddressesRepository.markAsBroadcasted).not.toHaveBeenCalled()
    expect(coreSDK.subscribeToTransactions).toHaveBeenCalled()
    expect(waitForAssetLockProofMock).toHaveBeenCalled()
    expect(identitiesRepository.create).toHaveBeenCalledWith(identifier, 'regular', 0)
    expect(assetLockFundingAddressesRepository.markAsUsed).toHaveBeenCalledWith(assetLockFundingAddress)
  })

  test('rejects when entry has assetLockTxid different from rebuilt asset lock txid', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValueOnce({
      address: assetLockFundingAddress,
      encryptedPrivateKey,
      used: false,
      assetLockTxid: 'c'.repeat(64)
    })

    await expect(handle()).rejects.toThrow(/already broadcasted with a different asset lock txid/)

    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    expect(identitiesRepository.create).not.toHaveBeenCalled()
  })

  test('rejects used funding entry', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValueOnce({
      address: assetLockFundingAddress,
      encryptedPrivateKey,
      used: true,
      assetLockTxid: null
    })

    await expect(handle()).rejects.toThrow('has already been used for registration')

    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  test('skips identity create when identifier already in repo', async () => {
    identitiesRepository.getByIdentifier.mockResolvedValueOnce({
      identifier,
      index: 0,
      label: null,
      proTxHash: null,
      type: 'regular'
    })

    await handle()

    expect(identitiesRepository.create).not.toHaveBeenCalled()
    expect(sdk.stateTransitions.broadcast).toHaveBeenCalled()
    expect(assetLockFundingAddressesRepository.markAsUsed).toHaveBeenCalled()
    expect(identitiesRepository.remove).not.toHaveBeenCalled()
  })

  test('treats "state transition already in chain" as success and skips wait', async () => {
    sdk.stateTransitions.broadcast.mockRejectedValueOnce(
      new Error('Object already exists: state transition already in chain')
    )

    const result = await handle()

    expect(result).toEqual({
      identifier,
      stateTransitionHash: 'stateTransitionHash'
    })
    expect(sdk.stateTransitions.waitForStateTransitionResult).not.toHaveBeenCalled()
    expect(identitiesRepository.remove).not.toHaveBeenCalled()
    expect(assetLockFundingAddressesRepository.markAsUsed).toHaveBeenCalled()
    expect(walletRepository.switchIdentity).toHaveBeenCalledWith(identifier)
  })

  test('removes just-created identity on non-idempotent Platform broadcast error', async () => {
    sdk.stateTransitions.broadcast.mockRejectedValueOnce(new Error('platform rejected transition'))

    await expect(handle()).rejects.toThrow('platform rejected transition')

    expect(identitiesRepository.create).toHaveBeenCalledWith(identifier, 'regular', 0)
    expect(identitiesRepository.remove).toHaveBeenCalledWith(identifier)
    expect(assetLockFundingAddressesRepository.markAsUsed).not.toHaveBeenCalled()
    expect(walletRepository.switchIdentity).not.toHaveBeenCalled()
  })

  test('does not remove identity on Platform error when identity was already in repo', async () => {
    identitiesRepository.getByIdentifier.mockResolvedValueOnce({
      identifier,
      index: 0,
      label: null,
      proTxHash: null,
      type: 'regular'
    })
    sdk.stateTransitions.broadcast.mockRejectedValueOnce(new Error('platform rejected transition'))

    await expect(handle()).rejects.toThrow('platform rejected transition')

    expect(identitiesRepository.create).not.toHaveBeenCalled()
    expect(identitiesRepository.remove).not.toHaveBeenCalled()
  })
})

describe('AssetLockFundingAddressesRepository broadcast support', () => {
  const storageKey = 'assetLockFundingAddresses_testnet_wallet1'

  let storage: MemoryStorageAdapter
  let repository: AssetLockFundingAddressesRepository

  beforeEach(async () => {
    storage = new MemoryStorageAdapter()
    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', 'wallet1')
    repository = new AssetLockFundingAddressesRepository(storage)
  })

  test('findUnused skips entries with assetLockTxid set', async () => {
    await storage.set(storageKey, {
      broadcasted: {
        address: 'broadcasted',
        encryptedPrivateKey: 'k',
        used: false,
        assetLockTxid: 'a'.repeat(64)
      },
      available: {
        address: 'available',
        encryptedPrivateKey: 'k',
        used: false,
        assetLockTxid: null
      }
    })

    await expect(repository.findUnused()).resolves.toEqual({
      address: 'available',
      encryptedPrivateKey: 'k',
      used: false,
      assetLockTxid: null
    })
  })

  test('markAsBroadcasted fails for missing entry', async () => {
    await storage.set(storageKey, {})

    await expect(repository.markAsBroadcasted('missing', 'a'.repeat(64))).rejects.toThrow(
      'Asset lock funding address missing not found'
    )
  })

  test('markAsBroadcasted fails for used entry', async () => {
    await storage.set(storageKey, {
      address: { address: 'address', encryptedPrivateKey: 'k', used: true, assetLockTxid: null }
    })

    await expect(repository.markAsBroadcasted('address', 'a'.repeat(64))).rejects.toThrow(
      'Asset lock funding address address has already been used'
    )
  })

  test('markAsBroadcasted fails when txid mismatches', async () => {
    await storage.set(storageKey, {
      address: { address: 'address', encryptedPrivateKey: 'k', used: false, assetLockTxid: 'a'.repeat(64) }
    })

    await expect(repository.markAsBroadcasted('address', 'b'.repeat(64))).rejects.toThrow(
      /is already broadcasted with txid/
    )
  })

  test('markAsBroadcasted is idempotent for the same txid', async () => {
    const txid = 'a'.repeat(64)
    await storage.set(storageKey, {
      address: { address: 'address', encryptedPrivateKey: 'k', used: false, assetLockTxid: txid }
    })

    await repository.markAsBroadcasted('address', txid)

    await expect(storage.get(storageKey)).resolves.toEqual({
      address: { address: 'address', encryptedPrivateKey: 'k', used: false, assetLockTxid: txid }
    })
  })

  test('markAsBroadcasted sets txid for fresh entry', async () => {
    const txid = 'a'.repeat(64)
    await storage.set(storageKey, {
      address: { address: 'address', encryptedPrivateKey: 'k', used: false }
    })

    await repository.markAsBroadcasted('address', txid)

    await expect(storage.get(storageKey)).resolves.toEqual({
      address: { address: 'address', encryptedPrivateKey: 'k', used: false, assetLockTxid: txid }
    })
  })

  test('markAsUsed preserves assetLockTxid', async () => {
    const txid = 'a'.repeat(64)
    await storage.set(storageKey, {
      address: { address: 'address', encryptedPrivateKey: 'k', used: false, assetLockTxid: txid }
    })

    await repository.markAsUsed('address')

    await expect(storage.get(storageKey)).resolves.toEqual({
      address: { address: 'address', encryptedPrivateKey: 'k', used: true, assetLockTxid: txid }
    })
  })
})

describe('IdentitiesRepository remove', () => {
  test('removes existing identity by identifier', async () => {
    const storage = new MemoryStorageAdapter()
    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', 'wallet1')
    const storageKey = 'identities_testnet_wallet1'
    await storage.set(storageKey, {
      idA: { identifier: 'idA', index: 0, label: null, proTxHash: null, type: 'regular' },
      idB: { identifier: 'idB', index: 1, label: null, proTxHash: null, type: 'regular' }
    })

    const { IdentitiesRepository } = await import('../../../../src/content-script/repository/IdentitiesRepository')
    const repo = new IdentitiesRepository(storage, {} as any)

    await repo.remove('idA')

    await expect(storage.get(storageKey)).resolves.toEqual({
      idB: { identifier: 'idB', index: 1, label: null, proTxHash: null, type: 'regular' }
    })
  })

  test('remove is a no-op for missing identifier', async () => {
    const storage = new MemoryStorageAdapter()
    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', 'wallet1')

    const { IdentitiesRepository } = await import('../../../../src/content-script/repository/IdentitiesRepository')
    const repo = new IdentitiesRepository(storage, {} as any)

    await expect(repo.remove('missing')).resolves.toBeUndefined()
  })
})
