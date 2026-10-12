import { ShieldFromWalletHandler } from '../../../../src/content-script/api/private/wallet/shieldFromWallet'
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

describe('ShieldFromWalletHandler', () => {
  let walletRepository: any
  let assetLockFundingAddressesRepository: any
  let pendingAssetLocksRepository: any
  let assetLockFunding: any
  let assetLock: any
  let requestAssetLockFundingAddress: any
  let sdk: any
  let shielded: any
  let stateTransition: any
  let handler: ShieldFromWalletHandler

  const event = (payload: any): any => ({ id: '1', context: 'dash-platform-extension', method: 'SHIELD_FROM_WALLET', type: 'request', payload })

  const handle = async (payload: any = { amountDuffs: '100000000', password: 'test' }): Promise<any> =>
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

    assetLockFunding = {
      fundFromWallet: jest.fn(async () => ({
        fundingTxid: 'b'.repeat(64), paid: true, feeDuffs: 226n, changeDuffs: 0n
      }))
    }
    assetLock = {
      commit: jest.fn(async () => ({
        assetLockTxid: 'c'.repeat(64),
        lockedAmount: 99_999_000n,
        assetLockProof: { proof: true }
      }))
    }
    requestAssetLockFundingAddress = { handle: jest.fn(async () => ({ address: FUNDING_ADDRESS })) }

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

    handler = new ShieldFromWalletHandler(
      walletRepository,
      assetLockFundingAddressesRepository,
      pendingAssetLocksRepository,
      assetLockFunding,
      assetLock,
      requestAssetLockFundingAddress,
      sdk,
      shielded
    )
  })

  it('pays the funding address, locks the deposit and deposits its credits into the pool', async () => {
    const order: string[] = []

    assetLockFunding.fundFromWallet.mockImplementation(async () => {
      order.push('fund')
      return { fundingTxid: 'b'.repeat(64), paid: true, feeDuffs: 226n, changeDuffs: 0n }
    })
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

    expect(order).toEqual(['fund', 'assetLock', 'shield'])
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
      assetLockTxid: 'c'.repeat(64),
      fundingAddress: FUNDING_ADDRESS,
      fundingTxid: 'b'.repeat(64),
      coreFeeDuffs: '226'
    })
  })

  it('asks for a funding address of its own purpose and records the asset lock as a shield', async () => {
    await handle()

    expect(requestAssetLockFundingAddress.handle).toHaveBeenCalledWith(expect.objectContaining({
      payload: { purpose: 'shield' }
    }))
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
    const response = await handle({ amountDuffs: '100000000', password: 'test', toShieldedAddress: OTHER_SHIELDED })

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

  it('refuses a wallet with no seed phrase to pay from', async () => {
    walletRepository.getCurrent.mockResolvedValue({ walletId: 'wallet1', type: 'keystore', network: 'testnet' })

    await expect(handle()).rejects.toThrow('only supported for a seedphrase wallet')
    expect(requestAssetLockFundingAddress.handle).not.toHaveBeenCalled()
  })

  describe('validatePayload', () => {
    it('accepts a well formed payload', () => {
      expect(handler.validatePayload({ amountDuffs: '100000000', password: 'test' })).toBeNull()
    })

    it('rejects an amount that cannot cover both fees', () => {
      expect(handler.validatePayload({ amountDuffs: '2000', password: 'test' })).toMatch(/shield fee/)
    })

    it('rejects a missing password and a non-integer amount', () => {
      expect(handler.validatePayload({ amountDuffs: '100000000', password: '' })).toMatch(/password/)
      expect(handler.validatePayload({ amountDuffs: '1.5', password: 'test' })).toMatch(/positive integer/)
    })
  })
})
