import { PrivateKey } from 'eciesjs'
import hash from 'hash.js'
import { RequestTopUpFundingAddressHandler } from '../../../../src/content-script/api/private/assetLocks/requestTopUpFundingAddress'
import { WalletType } from '../../../../src/types'
import { TOPUP_FUNDING_GAP_LIMIT } from '../../../../src/constants'

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    deriveIdentityTopUpKey: jest.fn()
  }
})

const { deriveIdentityTopUpKey } = jest.requireMock('../../../../src/utils')

describe('RequestTopUpFundingAddressHandler', () => {
  const password = 'test'
  // A real ECIES public key so the handler's encrypt() call succeeds.
  const passwordPublicKey = PrivateKey.fromHex(hash.sha256().update(password).digest('hex')).publicKey.toHex()

  let assetLockFundingAddressesRepository: any
  let walletRepository: any
  let coreExplorer: any
  let sdk: any
  let storageAdapter: any
  let handler: RequestTopUpFundingAddressHandler

  beforeEach(() => {
    jest.clearAllMocks()

    // Each derived key is distinguishable by its single-byte public key, which
    // p2pkhAddress maps to `yTopUpAddr<index>`.
    deriveIdentityTopUpKey.mockImplementation(async (_wallet: any, _password: string, index: number) => ({
      getPublicKey: () => ({ bytes: () => Uint8Array.of(index) }),
      hex: () => 'ab'.repeat(32)
    }))

    assetLockFundingAddressesRepository = {
      findUnused: jest.fn(async () => null),
      getByAddress: jest.fn(async () => null),
      create: jest.fn(async (entry: any) => entry)
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
      }))
    }

    coreExplorer = {
      isAddressUsed: jest.fn(async () => false)
    }

    sdk = {
      keyPair: {
        p2pkhAddress: jest.fn((bytes: Uint8Array) => `yTopUpAddr${bytes[0]}`)
      }
    }

    storageAdapter = {
      get: jest.fn(async (key: string) => (key === 'passwordPublicKey' ? passwordPublicKey : null)),
      set: jest.fn(),
      remove: jest.fn(),
      getAll: jest.fn()
    }

    handler = new RequestTopUpFundingAddressHandler(
      assetLockFundingAddressesRepository,
      walletRepository,
      coreExplorer,
      sdk,
      storageAdapter
    )
  })

  it('returns the first index whose address is unused on L1', async () => {
    coreExplorer.isAddressUsed.mockImplementation(async (address: string) =>
      address === 'yTopUpAddr0' || address === 'yTopUpAddr1'
    )

    const result = await handler.handle({ payload: { password } } as any)

    expect(result).toEqual({ address: 'yTopUpAddr2' })
    expect(assetLockFundingAddressesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'yTopUpAddr2', index: 2, purpose: 'topUp', used: false })
    )
    expect(assetLockFundingAddressesRepository.create.mock.calls[0][0].encryptedPrivateKey).toEqual(expect.any(String))
  })

  it('reuses a pending top-up funding address without scanning', async () => {
    assetLockFundingAddressesRepository.findUnused.mockResolvedValueOnce({ address: 'yPending' })

    const result = await handler.handle({ payload: { password } } as any)

    expect(result).toEqual({ address: 'yPending' })
    expect(assetLockFundingAddressesRepository.findUnused).toHaveBeenCalledWith('topUp')
    expect(deriveIdentityTopUpKey).not.toHaveBeenCalled()
    expect(assetLockFundingAddressesRepository.create).not.toHaveBeenCalled()
  })

  it('skips indexes already claimed by a local entry', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockImplementation(async (address: string) =>
      address === 'yTopUpAddr0' ? { address } : null
    )

    const result = await handler.handle({ payload: { password } } as any)

    expect(result).toEqual({ address: 'yTopUpAddr1' })
    // index 0 was claimed locally, so we never asked the explorer about it
    expect(coreExplorer.isAddressUsed).not.toHaveBeenCalledWith('yTopUpAddr0', 'testnet')
  })

  it('throws when no unused address is found within the gap limit', async () => {
    coreExplorer.isAddressUsed.mockResolvedValue(true)

    await expect(handler.handle({ payload: { password } } as any)).rejects.toThrow('No unused top-up funding address')
    expect(coreExplorer.isAddressUsed).toHaveBeenCalledTimes(TOPUP_FUNDING_GAP_LIMIT)
    expect(assetLockFundingAddressesRepository.create).not.toHaveBeenCalled()
  })

  it('throws when the extension password is not set up', async () => {
    storageAdapter.get.mockResolvedValue(null)

    await expect(handler.handle({ payload: { password } } as any)).rejects.toThrow('Password is not set')
  })

  describe('validatePayload', () => {
    it('rejects a missing password', () => {
      expect(handler.validatePayload({} as any)).toBe('password must be provided')
    })

    it('accepts a valid payload', () => {
      expect(handler.validatePayload({ password })).toBeNull()
    })
  })
})
