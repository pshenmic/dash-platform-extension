import { ShieldFromCoreHandler } from '../../../../src/content-script/api/private/wallet/shieldFromCore'
import { computeShieldedDepositFee } from '../../../../src/utils/shieldedFee'
import { decryptAssetLockFundingKey } from '../../../../src/utils/assetLockFundingKey'

jest.mock('../../../../src/utils/assetLockFundingKey', () => ({
  decryptAssetLockFundingKey: jest.fn()
}))

// Keep the real pshenmic-dpp and only stub the shielded address parsing.
jest.mock('pshenmic-dpp', () => {
  const actual = jest.requireActual('pshenmic-dpp')
  return {
    ...actual,
    OrchardAddressWASM: {
      ...actual.OrchardAddressWASM,
      fromBech32m: jest.fn((address) => ({ address, toBech32m: () => address }))
    }
  }
})

const decryptAssetLockFundingKeyMock = decryptAssetLockFundingKey as jest.MockedFunction<typeof decryptAssetLockFundingKey>

const FUNDING_ADDRESS = 'yFundingAddress'
const OWN_SHIELDED = 'tdashshielded1own'
const OTHER_SHIELDED = 'tdashshielded1other'
const XPUB = 'tpubAccountXpub'

describe('ShieldFromCoreHandler', () => {
  let walletRepository: any
  let assetLockFundingAddressesRepository: any
  let pendingAssetLocksRepository: any
  let assetLock: any
  let sdk: any
  let shielded: any
  let stateTransition: any
  let handler: ShieldFromCoreHandler

  const deposit = {
    assetLockFundingAddress: FUNDING_ADDRESS,
    assetLockFundingTxid: 'b'.repeat(64),
    password: 'test'
  }

  const event = (payload: any): any => ({ id: '1', context: 'dash-platform-extension', method: 'SHIELD_FROM_CORE', type: 'request', payload })

  const handle = async (payload: any = deposit): Promise<any> =>
    await handler.handle(event(payload))

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({ walletId: 'wallet1', type: 'seedphrase', network: 'testnet' })),
      getCoreAccountXpub: jest.fn(async () => XPUB)
    }
    assetLockFundingAddressesRepository = {
      getByAddress: jest.fn(async () => ({ address: FUNDING_ADDRESS, encryptedPrivateKey: 'k', used: false })),
      markAsUsed: jest.fn(async () => {})
    }
    pendingAssetLocksRepository = { remove: jest.fn(async () => {}) }

    assetLock = {
      commit: jest.fn(async () => ({
        assetLockTxid: 'c'.repeat(64),
        lockedAmount: 99_999_000n,
        assetLockProof: { proof: true }
      }))
    }
    stateTransition = { hash: jest.fn(() => 'a'.repeat(64)) }

    sdk = {
      keyPair: {
        deriveShieldedAddress: jest.fn(() => ({ toBech32m: () => OWN_SHIELDED })),
        deriveShieldedOutgoingViewingKey: jest.fn(() => new Uint8Array(32).fill(3))
      },
      shielded: { createStateTransition: jest.fn(async () => stateTransition) },
      stateTransitions: {
        broadcast: jest.fn(async () => {}),
        waitForStateTransitionResult: jest.fn(async () => {})
      }
    }

    shielded = {
      deriveSeed: jest.fn(() => new Uint8Array(64).fill(1)),
      validateMemo: jest.fn(() => null),
      validateAccount: jest.fn(() => null)
    }

    decryptAssetLockFundingKeyMock.mockReturnValue({ WIF: () => 'fundingWif' } as any)

    handler = new ShieldFromCoreHandler(
      walletRepository,
      assetLockFundingAddressesRepository,
      pendingAssetLocksRepository,
      assetLock,
      sdk,
      shielded
    )
  })

  it('locks the deposit and deposits its credits into the pool', async () => {
    const order: string[] = []

    assetLock.commit.mockImplementation(async () => {
      order.push('assetLock')
      return { assetLockTxid: 'c'.repeat(64), lockedAmount: 99_999_000n, assetLockProof: { proof: true } }
    })
    sdk.shielded.createStateTransition.mockImplementation(async () => {
      order.push('shield')
      return stateTransition
    })

    const feeCredits = computeShieldedDepositFee()
    const response = await handle()

    expect(order).toEqual(['assetLock', 'shield'])
    expect(sdk.shielded.createStateTransition).toHaveBeenCalledWith('shieldFromAssetLock', expect.objectContaining({
      shieldAmount: 99_999_000n * 1000n - feeCredits,
      assetLockProof: { proof: true },
      dummyOutputs: 0
    }))
    expect(response).toEqual({
      stHash: 'a'.repeat(64),
      shieldedAmountCredits: (99_999_000n * 1000n - feeCredits).toString(),
      shieldFeeCredits: feeCredits.toString(),
      toShieldedAddress: OWN_SHIELDED,
      assetLockTxid: 'c'.repeat(64)
    })
  })

  it('records the asset lock as a shield and spends the deposit it was given', async () => {
    await handle()

    expect(assetLock.commit).toHaveBeenCalledWith(expect.objectContaining({
      purpose: 'shield',
      identityId: null,
      platformAddress: null,
      creditOutputAddress: FUNDING_ADDRESS,
      fundingTxid: 'b'.repeat(64)
    }))
  })

  it('shields to the wallet own address when none is named', async () => {
    const response = await handle()

    expect(sdk.keyPair.deriveShieldedAddress).toHaveBeenCalled()
    expect(response.toShieldedAddress).toBe(OWN_SHIELDED)
  })

  it('shields to another shielded address when one is named', async () => {
    const response = await handle({ ...deposit, toShieldedAddress: OTHER_SHIELDED })

    expect(response.toShieldedAddress).toBe(OTHER_SHIELDED)
    expect(sdk.shielded.createStateTransition).toHaveBeenCalledWith('shieldFromAssetLock', expect.objectContaining({
      recipient: expect.objectContaining({ address: OTHER_SHIELDED })
    }))
  })

  it('clears the pending records only after the credits are in the pool', async () => {
    const order: string[] = []

    sdk.stateTransitions.waitForStateTransitionResult.mockImplementation(async () => { order.push('platformWait') })
    assetLockFundingAddressesRepository.markAsUsed.mockImplementation(async () => { order.push('markUsed') })
    pendingAssetLocksRepository.remove.mockImplementation(async () => { order.push('removePending') })

    await handle()

    expect(order).toEqual(['platformWait', 'markUsed', 'removePending'])
  })

  it('refuses a deposit too small to carry the shield fee', async () => {
    assetLock.commit.mockResolvedValue({
      assetLockTxid: 'c'.repeat(64),
      lockedAmount: 1_000n,
      assetLockProof: { proof: true }
    })

    await expect(handle()).rejects.toThrow('leaves nothing to shield')
    expect(sdk.shielded.createStateTransition).not.toHaveBeenCalled()
  })

  it('refuses a wallet with no seed phrase behind it', async () => {
    walletRepository.getCurrent.mockResolvedValue({ walletId: 'wallet1', type: 'keystore', network: 'testnet' })

    await expect(handle()).rejects.toThrow('only supported for a seedphrase wallet')
    expect(assetLock.commit).not.toHaveBeenCalled()
  })

  it('refuses a funding address this wallet never handed out', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue(null)

    await expect(handle()).rejects.toThrow('not found')
    expect(assetLock.commit).not.toHaveBeenCalled()
  })

  it('refuses a funding address whose deposit is already spent', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, encryptedPrivateKey: 'k', used: true
    })

    await expect(handle()).rejects.toThrow('has already been used')
    expect(assetLock.commit).not.toHaveBeenCalled()
  })

  describe('validatePayload', () => {
    it('accepts a well formed payload', () => {
      expect(handler.validatePayload(deposit)).toBeNull()
    })

    it('rejects a deposit it cannot address', () => {
      expect(handler.validatePayload({ ...deposit, assetLockFundingAddress: '' })).toMatch(/assetLockFundingAddress/)
      expect(handler.validatePayload({ ...deposit, assetLockFundingTxid: 'short' })).toMatch(/64-character hex/)
    })

    it('rejects a missing password', () => {
      expect(handler.validatePayload({ ...deposit, password: '' })).toMatch(/password/)
    })
  })
})
