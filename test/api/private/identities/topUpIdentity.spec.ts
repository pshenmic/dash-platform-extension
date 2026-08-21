import { PrivateKey, encrypt } from 'eciesjs'
import hash from 'hash.js'
import { KeyType, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { TopUpIdentityHandler } from '../../../../src/content-script/api/private/identities/topUpIdentity'
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
        assetLockTxid: null
      })),
      markAsBroadcasted: jest.fn(async () => {
        order.push('markBroadcasted')
      }),
      markAsUsed: jest.fn(async () => {
        order.push('markUsed')
      })
    }

    // The handler pins all three repositories to the resolved (network, wallet)
    // pair before using them; the mocks stay the same object under any scope.
    walletRepository.forScope = jest.fn(() => walletRepository)
    identitiesRepository.forScope = jest.fn(() => identitiesRepository)
    assetLockFundingAddressesRepository.forScope = jest.fn(() => assetLockFundingAddressesRepository)

    coreSDK = {
      // Both SDKs are fixed to a network for the lifetime of their document, and
      // the handler refuses to run against a scope they cannot serve.
      network: 'testnet',
      subscribeToTransactions: jest.fn(() => {
        order.push('subscribe')
        return { close: jest.fn() }
      }),
      broadcastTransaction: jest.fn(async () => {
        order.push('l1Broadcast')
      })
    }

    sdk = {
      getNetwork: jest.fn(() => 'testnet'),
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
      return { assetLockTx, lockedAmount: 100000n } as any
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

  const handle = async (extraPayload: any = {}): Promise<any> => {
    return await handler.handle({
      context: 'dash-platform-extension',
      id: 'id',
      method: 'TOP_UP_IDENTITY',
      type: 'request',
      payload: {
        identityId,
        assetLockFundingAddress,
        assetLockFundingTxid,
        password,
        ...extraPayload
      }
    })
  }

  test('tops up identity using instant-lock asset-lock proof', async () => {
    const result = await handle()

    expect(result).toEqual({
      identityId,
      stateTransitionHash: 'stateTransitionHash',
      topUpAmount: 100000000n
    })

    expect(buildAssetLockFromFundingTxMock).toHaveBeenCalledWith(
      coreSDK,
      assetLockFundingTxid,
      assetLockFundingAddress,
      expect.any(String),
      assetLockFundingAddress
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
    expect(assetLockFundingAddressesRepository.markAsBroadcasted).toHaveBeenCalledWith(
      assetLockFundingAddress,
      assetLockTxid
    )
    expect(sdk.stateTransitions.broadcast).toHaveBeenCalledWith(stateTransition)
    expect(sdk.stateTransitions.waitForStateTransitionResult).toHaveBeenCalledWith(stateTransition)
    expect(order).toEqual([
      'build',
      'subscribe',
      'l1Broadcast',
      'markBroadcasted',
      'waitProof',
      'platformBroadcast',
      'platformWait',
      'markUsed'
    ])
  })

  test('rejects identity that does not belong to the scoped wallet', async () => {
    identitiesRepository.getByIdentifier.mockResolvedValueOnce(null)

    await expect(handle()).rejects.toThrow(`Identity ${identityId} does not belong to wallet wallet1 on testnet`)

    expect(assetLockFundingAddressesRepository.markAsBroadcasted).not.toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    expect(sdk.stateTransitions.broadcast).not.toHaveBeenCalled()
  })

  test('rejects missing funding address', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValueOnce(null)

    await expect(handle()).rejects.toThrow(`Asset lock funding address ${assetLockFundingAddress} not found`)

    expect(assetLockFundingAddressesRepository.markAsBroadcasted).not.toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  test('rejects used funding address', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValueOnce({
      address: assetLockFundingAddress,
      encryptedPrivateKey,
      used: true,
      assetLockTxid: null
    })

    await expect(handle()).rejects.toThrow(`Asset lock funding address ${assetLockFundingAddress} has already been used`)

    expect(assetLockFundingAddressesRepository.markAsBroadcasted).not.toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  test('rejects a funding address reserved for another identity', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValueOnce({
      address: assetLockFundingAddress,
      encryptedPrivateKey,
      used: false,
      assetLockTxid: null,
      identityId: 'someOtherIdentity'
    })

    await expect(handle()).rejects.toThrow(
      `Asset lock funding address ${assetLockFundingAddress} is reserved for identity someOtherIdentity`
    )

    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    expect(sdk.stateTransitions.broadcast).not.toHaveBeenCalled()
    expect(assetLockFundingAddressesRepository.markAsBroadcasted).not.toHaveBeenCalled()
  })

  test('accepts a funding address reserved for this identity', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValueOnce({
      address: assetLockFundingAddress,
      encryptedPrivateKey,
      used: false,
      assetLockTxid: null,
      identityId
    })

    await expect(handle()).resolves.toEqual({ identityId, stateTransitionHash: 'stateTransitionHash' })
  })

  test('accepts an unreserved funding address created before reservations existed', async () => {
    // The default mock entry carries no identityId, which is the legacy shape.
    await expect(handle()).resolves.toEqual({ identityId, stateTransitionHash: 'stateTransitionHash' })
  })

  test('rejects wrong password without broadcasting', async () => {
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

    expect(assetLockFundingAddressesRepository.markAsBroadcasted).not.toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  test('does not broadcast when asset-lock tx build fails', async () => {
    const error = new Error('bad funding tx')
    buildAssetLockFromFundingTxMock.mockRejectedValueOnce(error)

    await expect(handle()).rejects.toThrow(error)

    expect(assetLockFundingAddressesRepository.markAsBroadcasted).not.toHaveBeenCalled()
    expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
  })

  test('treats idempotent platform error as success and marks used', async () => {
    sdk.stateTransitions.waitForStateTransitionResult.mockRejectedValueOnce(
      new Error(`Asset lock transaction ${assetLockTxid} output 0 already completely used`)
    )

    const result = await handle()

    expect(result).toEqual({
      identityId,
      stateTransitionHash: 'stateTransitionHash',
      topUpAmount: 100000000n
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
      stateTransitionHash: 'stateTransitionHash',
      topUpAmount: 100000000n
    })
    expect(assetLockFundingAddressesRepository.markAsUsed).toHaveBeenCalledWith(assetLockFundingAddress)
    expect(sdk.stateTransitions.waitForStateTransitionResult).not.toHaveBeenCalled()
  })

  test('propagates non-idempotent platform error without marking used', async () => {
    sdk.stateTransitions.broadcast.mockRejectedValueOnce(new Error('platform rejected transition'))

    await expect(handle()).rejects.toThrow('platform rejected transition')

    expect(assetLockFundingAddressesRepository.markAsBroadcasted).toHaveBeenCalledWith(
      assetLockFundingAddress,
      assetLockTxid
    )
    expect(assetLockFundingAddressesRepository.markAsUsed).not.toHaveBeenCalled()
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
    expect(assetLockFundingAddressesRepository.markAsBroadcasted).not.toHaveBeenCalled()
  })

  describe('wallet and network scope', () => {
    test('pins every repository to the pair named in the payload', async () => {
      await handle({ walletId: 'walletFromTab', network: 'testnet' })

      const scope = { network: 'testnet', walletId: 'walletFromTab' }

      expect(walletRepository.forScope).toHaveBeenCalledWith(scope)
      expect(identitiesRepository.forScope).toHaveBeenCalledWith(scope)
      expect(assetLockFundingAddressesRepository.forScope).toHaveBeenCalledWith(scope)
      // The named wallet is used directly, without consulting the current selection.
      expect(walletRepository.getCurrent).toHaveBeenCalledTimes(1)
    })

    test('falls back to the current wallet when the payload omits the pair', async () => {
      await handle()

      const scope = { network: 'testnet', walletId: 'wallet1' }

      expect(walletRepository.forScope).toHaveBeenCalledWith(scope)
      expect(identitiesRepository.forScope).toHaveBeenCalledWith(scope)
      expect(assetLockFundingAddressesRepository.forScope).toHaveBeenCalledWith(scope)
    })

    test('resolves the scope once, before anything is broadcast', async () => {
      await handle({ walletId: 'walletFromTab', network: 'testnet' })

      // A single resolution per repository is what keeps the writes that follow
      // the asset lock wait (markAsBroadcasted, markAsUsed) on the same store.
      expect(assetLockFundingAddressesRepository.forScope).toHaveBeenCalledTimes(1)
      expect(order.indexOf('markUsed')).toBeGreaterThan(order.indexOf('l1Broadcast'))
    })

    test('throws when the scoped wallet does not exist', async () => {
      walletRepository.getCurrent.mockResolvedValueOnce(null)

      await expect(handle({ walletId: 'walletFromTab', network: 'testnet' }))
        .rejects.toThrow('Wallet walletFromTab does not exist on testnet')

      expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    })

    test('refuses to run when the platform SDK is on another network', async () => {
      sdk.getNetwork.mockReturnValue('mainnet')

      await expect(handle({ walletId: 'wallet1', network: 'testnet' }))
        .rejects.toThrow('Top-up is bound to testnet')

      expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
      expect(sdk.stateTransitions.broadcast).not.toHaveBeenCalled()
    })

    test('refuses to run when the core SDK is on another network', async () => {
      coreSDK.network = 'mainnet'

      await expect(handle({ walletId: 'wallet1', network: 'testnet' }))
        .rejects.toThrow('Top-up is bound to testnet')

      expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
    })

    test('rejects a payload naming only one half of the pair', () => {
      expect(handler.validatePayload({ identityId, assetLockFundingAddress, assetLockFundingTxid, password, walletId: 'wallet1' } as any))
        .toBe('walletId and network must be provided together')
      expect(handler.validatePayload({ identityId, assetLockFundingAddress, assetLockFundingTxid, password, network: 'testnet' } as any))
        .toBe('walletId and network must be provided together')
    })

    test('rejects an unknown network', () => {
      expect(handler.validatePayload({ identityId, assetLockFundingAddress, assetLockFundingTxid, password, walletId: 'wallet1', network: 'regtest' } as any))
        .toBe('network must be either testnet or mainnet')
    })

    test('accepts a payload without the pair', () => {
      expect(handler.validatePayload({ identityId, assetLockFundingAddress, assetLockFundingTxid, password } as any)).toBeNull()
    })
  })
})

describe('AssetLockFundingAddressesRepository broadcast support', () => {
  const storageKey = 'assetLockFundingAddresses_testnet_wallet1'

  let storage: TestStorageAdapter
  let repository: AssetLockFundingAddressesRepository

  beforeEach(async () => {
    storage = new TestStorageAdapter()
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

describe('AssetLockFundingAddressesRepository identity reservation', () => {
  const storageKey = 'assetLockFundingAddresses_testnet_wallet1'

  let storage: TestStorageAdapter
  let repository: AssetLockFundingAddressesRepository

  const seed = async (entries: Record<string, any>): Promise<void> => {
    await storage.set(storageKey, entries)
  }

  const topUpEntry = (address: string, identityId?: string): any => ({
    address, encryptedPrivateKey: 'k', used: false, purpose: 'topUp', ...(identityId != null ? { identityId } : {})
  })

  beforeEach(async () => {
    storage = new TestStorageAdapter()
    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', 'wallet1')
    repository = new AssetLockFundingAddressesRepository(storage)
  })

  test('findAllUnused returns entries reserved for the identity and unreserved ones', async () => {
    await seed({
      mine: topUpEntry('mine', 'identityA'),
      theirs: topUpEntry('theirs', 'identityB'),
      unreserved: topUpEntry('unreserved')
    })

    const found = await repository.findAllUnused('topUp', 'identityA')

    expect(found.map(entry => entry.address).sort()).toEqual(['mine', 'unreserved'])
  })

  test('findAllUnused without an identity keeps every reservation', async () => {
    await seed({ mine: topUpEntry('mine', 'identityA'), theirs: topUpEntry('theirs', 'identityB') })

    const found = await repository.findAllUnused('topUp')

    expect(found).toHaveLength(2)
  })

  test('bindToIdentity reserves an unreserved entry', async () => {
    await seed({ unreserved: topUpEntry('unreserved') })

    await repository.bindToIdentity('unreserved', 'identityA')

    expect((await repository.getByAddress('unreserved'))?.identityId).toBe('identityA')
  })

  test('bindToIdentity is idempotent for the same identity', async () => {
    await seed({ mine: topUpEntry('mine', 'identityA') })

    await expect(repository.bindToIdentity('mine', 'identityA')).resolves.toBeUndefined()
  })

  test('bindToIdentity refuses to re-point an entry at another identity', async () => {
    await seed({ mine: topUpEntry('mine', 'identityA') })

    await expect(repository.bindToIdentity('mine', 'identityB'))
      .rejects.toThrow('is already reserved for identity identityA')

    expect((await repository.getByAddress('mine'))?.identityId).toBe('identityA')
  })

  test('bindToIdentity fails for a missing entry', async () => {
    await expect(repository.bindToIdentity('missing', 'identityA')).rejects.toThrow('not found')
  })
})

describe('IdentitiesRepository remove', () => {
  const storageKey = 'identities_testnet_wallet1'

  let storage: TestStorageAdapter

  beforeEach(async () => {
    storage = new TestStorageAdapter()
    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', 'wallet1')
  })

  test('removes existing identity by identifier', async () => {
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
    const { IdentitiesRepository } = await import('../../../../src/content-script/repository/IdentitiesRepository')
    const repo = new IdentitiesRepository(storage, {} as any)

    await expect(repo.remove('missing')).resolves.toBeUndefined()
  })
})
