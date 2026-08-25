import { PrivateKey } from 'eciesjs'
import hash from 'hash.js'
import { RequestTopUpFundingAddressHandler } from '../../../../src/content-script/api/private/assetLocks/requestTopUpFundingAddress'
import { WalletType } from '../../../../src/types'
import { TOPUP_FUNDING_GAP_LIMIT } from '../../../../src/constants'

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    deriveWalletHdKey: jest.fn(),
    deriveTopUpKeyFromHdKey: jest.fn()
  }
})

const { deriveWalletHdKey, deriveTopUpKeyFromHdKey } = jest.requireMock('../../../../src/utils')

const CURRENT_IDENTITY = 'identityCurrent'
const OTHER_IDENTITY = 'identityOther'

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

    // The wallet HD root is built once; each derived child key is distinguishable
    // by its single-byte public key, which p2pkhAddress maps to `yTopUpAddr<index>`.
    deriveWalletHdKey.mockReturnValue({ hd: true })
    deriveTopUpKeyFromHdKey.mockImplementation(async (_hdKey: any, _network: string, index: number) => ({
      getPublicKey: () => ({ bytes: () => Uint8Array.of(index) }),
      hex: () => 'ab'.repeat(32)
    }))

    assetLockFundingAddressesRepository = {
      findAllUnused: jest.fn(async () => []),
      getByAddress: jest.fn(async () => null),
      create: jest.fn(async (entry: any) => entry),
      markAsUsed: jest.fn(async () => {}),
      bindToIdentity: jest.fn(async () => {})
    }

    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1',
        type: WalletType.seedphrase,
        network: 'testnet',
        label: null,
        encryptedMnemonic: 'encryptedMnemonic',
        seedHash: 'seedHash',
        currentIdentity: CURRENT_IDENTITY
      }))
    }

    // The handler pins both repositories to the resolved (network, wallet) pair
    // before using them; the mocks stay the same object under any scope.
    assetLockFundingAddressesRepository.forScope = jest.fn(() => assetLockFundingAddressesRepository)
    walletRepository.forScope = jest.fn(() => walletRepository)

    coreExplorer = {
      isAddressUsed: jest.fn(async () => false),
      // Defaults model a never-seen address: no history, no UTXOs.
      getAddressInfo: jest.fn(async () => null),
      getAddressUtxos: jest.fn(async () => [])
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

  it('reuses a pending address with no on-chain history (awaiting deposit)', async () => {
    assetLockFundingAddressesRepository.findAllUnused.mockResolvedValueOnce([{ address: 'yPending' }])

    const result = await handler.handle({ payload: { password } } as any)

    expect(result).toEqual({ address: 'yPending' })
    expect(assetLockFundingAddressesRepository.findAllUnused).toHaveBeenCalledWith('topUp', CURRENT_IDENTITY)
    expect(deriveWalletHdKey).not.toHaveBeenCalled()
    expect(deriveTopUpKeyFromHdKey).not.toHaveBeenCalled()
    expect(assetLockFundingAddressesRepository.create).not.toHaveBeenCalled()
    expect(assetLockFundingAddressesRepository.markAsUsed).not.toHaveBeenCalled()
  })

  it('reuses a pending address that still holds a deposit (history + UTXO)', async () => {
    assetLockFundingAddressesRepository.findAllUnused.mockResolvedValueOnce([{ address: 'yDeposited' }])
    coreExplorer.getAddressInfo.mockResolvedValueOnce({ txCount: 1, balance: 1000n, received: 1000n, sent: 0n })
    coreExplorer.getAddressUtxos.mockResolvedValueOnce([{ txid: 'aa', vout: 0, amount: 1000n }])

    const result = await handler.handle({ payload: { password } } as any)

    expect(result).toEqual({ address: 'yDeposited' })
    expect(assetLockFundingAddressesRepository.markAsUsed).not.toHaveBeenCalled()
    expect(deriveTopUpKeyFromHdKey).not.toHaveBeenCalled()
  })

  it('discards a pending address consumed on L1 (history, no UTXO) and gap-scans for a fresh index', async () => {
    assetLockFundingAddressesRepository.findAllUnused.mockResolvedValueOnce([{
      address: 'yConsumed', index: 0, purpose: 'topUp', used: false
    }])
    coreExplorer.getAddressInfo.mockResolvedValueOnce({ txCount: 2, balance: 0n, received: 1000n, sent: 1000n })
    coreExplorer.getAddressUtxos.mockResolvedValueOnce([])

    const result = await handler.handle({ payload: { password } } as any)

    expect(assetLockFundingAddressesRepository.markAsUsed).toHaveBeenCalledWith('yConsumed')
    expect(result).toEqual({ address: 'yTopUpAddr0' })
    expect(assetLockFundingAddressesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'yTopUpAddr0', index: 0, purpose: 'topUp', used: false })
    )
  })

  it('retires consumed pending entries and reuses the first live one (multiple pending)', async () => {
    assetLockFundingAddressesRepository.findAllUnused.mockResolvedValueOnce([
      { address: 'yConsumed' },
      { address: 'yLive' }
    ])
    coreExplorer.getAddressInfo
      .mockResolvedValueOnce({ txCount: 2, balance: 0n, received: 1000n, sent: 1000n }) // yConsumed
      .mockResolvedValueOnce(null) // yLive — never seen
    coreExplorer.getAddressUtxos
      .mockResolvedValueOnce([]) // yConsumed — no UTXO
      .mockResolvedValueOnce([]) // yLive

    const result = await handler.handle({ payload: { password } } as any)

    expect(assetLockFundingAddressesRepository.markAsUsed).toHaveBeenCalledWith('yConsumed')
    expect(assetLockFundingAddressesRepository.markAsUsed).not.toHaveBeenCalledWith('yLive')
    expect(result).toEqual({ address: 'yLive' })
    expect(assetLockFundingAddressesRepository.create).not.toHaveBeenCalled()
    expect(deriveWalletHdKey).not.toHaveBeenCalled()
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

  describe('identity reservation', () => {
    it('reserves the address for the identity named in the payload', async () => {
      await handler.handle({ payload: { password, identityId: OTHER_IDENTITY } } as any)

      expect(assetLockFundingAddressesRepository.findAllUnused).toHaveBeenCalledWith('topUp', OTHER_IDENTITY)
      expect(assetLockFundingAddressesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ identityId: OTHER_IDENTITY, purpose: 'topUp' })
      )
    })

    it('falls back to the wallet current identity', async () => {
      await handler.handle({ payload: { password } } as any)

      expect(assetLockFundingAddressesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ identityId: CURRENT_IDENTITY })
      )
    })

    it('claims a pending entry that has no owner yet', async () => {
      assetLockFundingAddressesRepository.findAllUnused.mockResolvedValueOnce([{ address: 'yLegacy' }])

      const result = await handler.handle({ payload: { password, identityId: OTHER_IDENTITY } } as any)

      expect(result).toEqual({ address: 'yLegacy' })
      expect(assetLockFundingAddressesRepository.bindToIdentity).toHaveBeenCalledWith('yLegacy', OTHER_IDENTITY)
    })

    it('reuses the same address when the same identity asks again', async () => {
      assetLockFundingAddressesRepository.findAllUnused.mockResolvedValue([
        { address: 'yReserved', identityId: OTHER_IDENTITY }
      ])

      const first = await handler.handle({ payload: { password, identityId: OTHER_IDENTITY } } as any)
      const second = await handler.handle({ payload: { password, identityId: OTHER_IDENTITY } } as any)

      expect(second).toEqual(first)
      expect(assetLockFundingAddressesRepository.create).not.toHaveBeenCalled()
    })

    it('gap-scans a fresh address when the pending one belongs to another identity', async () => {
      // The repository filters foreign reservations out, so the handler sees none.
      assetLockFundingAddressesRepository.findAllUnused.mockResolvedValueOnce([])

      const result = await handler.handle({ payload: { password, identityId: OTHER_IDENTITY } } as any)

      expect(assetLockFundingAddressesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ identityId: OTHER_IDENTITY })
      )
      expect(result.address).toEqual(expect.any(String))
    })

    it('throws when neither the payload nor the wallet names an identity', async () => {
      // getCurrent is consulted twice: once to resolve the scope, once through the
      // scoped repository, so the override has to hold for both.
      walletRepository.getCurrent.mockResolvedValue({
        walletId: 'wallet1', type: WalletType.seedphrase, network: 'testnet', currentIdentity: null
      })

      await expect(handler.handle({ payload: { password } } as any))
        .rejects.toThrow('No identity is chosen to top up')

      expect(assetLockFundingAddressesRepository.create).not.toHaveBeenCalled()
    })

    it('rejects a malformed identityId', () => {
      expect(handler.validatePayload({ password, identityId: '' } as any))
        .toBe('identityId must be a non-empty string when provided')
      expect(handler.validatePayload({ password, identityId: 1 } as any))
        .toBe('identityId must be a non-empty string when provided')
    })
  })

  describe('wallet and network scope', () => {
    it('pins both repositories to the pair named in the payload', async () => {
      await handler.handle({ payload: { password, walletId: 'walletFromTab', network: 'testnet' } } as any)

      const scope = { network: 'testnet', walletId: 'walletFromTab' }

      expect(walletRepository.forScope).toHaveBeenCalledWith(scope)
      expect(assetLockFundingAddressesRepository.forScope).toHaveBeenCalledWith(scope)
      // The named wallet is used directly, without consulting the current selection.
      expect(walletRepository.getCurrent).toHaveBeenCalledTimes(1)
    })

    it('falls back to the current wallet when the payload omits the pair', async () => {
      await handler.handle({ payload: { password } } as any)

      const scope = { network: 'testnet', walletId: 'wallet1' }

      expect(walletRepository.forScope).toHaveBeenCalledWith(scope)
      expect(assetLockFundingAddressesRepository.forScope).toHaveBeenCalledWith(scope)
    })

    it('throws when the scoped wallet does not exist', async () => {
      walletRepository.getCurrent.mockResolvedValueOnce(null)

      await expect(handler.handle({ payload: { password, walletId: 'walletFromTab', network: 'testnet' } } as any))
        .rejects.toThrow('Wallet walletFromTab does not exist on testnet')

      expect(assetLockFundingAddressesRepository.create).not.toHaveBeenCalled()
    })

    it('rejects a payload naming only one half of the pair', () => {
      expect(handler.validatePayload({ password, walletId: 'wallet1' } as any))
        .toBe('walletId and network must be provided together')
      expect(handler.validatePayload({ password, network: 'testnet' } as any))
        .toBe('walletId and network must be provided together')
    })

    it('rejects an unknown network', () => {
      expect(handler.validatePayload({ password, walletId: 'wallet1', network: 'regtest' } as any))
        .toBe('network must be either testnet or mainnet')
    })

    it('accepts a payload carrying the pair', () => {
      expect(handler.validatePayload({ password, walletId: 'wallet1', network: 'mainnet' } as any)).toBeNull()
    })
  })
})
