import { ShieldFromWalletHandler } from '../../../../src/content-script/api/private/wallet/shieldFromWallet'
import { computeShieldedDepositFee } from '../../../../src/utils/shieldedFee'

const FUNDING_ADDRESS = 'yFundingAddress'
const OWN_SHIELDED = 'tdashshielded1own'
const XPUB = 'tpubAccountXpub'

describe('ShieldFromWalletHandler', () => {
  let walletRepository: any
  let assetLockFundingAddressesRepository: any
  let assetLockFunding: any
  let requestAssetLockFundingAddress: any
  let shieldFromCore: any
  let sdk: any
  let shielded: any
  let handler: ShieldFromWalletHandler

  const shieldedResult = {
    stHash: 'a'.repeat(64),
    shieldedAmountCredits: '99837148800',
    shieldFeeCredits: computeShieldedDepositFee().toString(),
    toShieldedAddress: OWN_SHIELDED,
    assetLockTxid: 'c'.repeat(64)
  }

  const event = (payload: any): any => ({ id: '1', context: 'dash-platform-extension', method: 'SHIELD_FROM_WALLET', type: 'request', payload })

  const handle = async (payload: any = { amountDuffs: '100000000', password: 'test' }): Promise<any> =>
    await handler.handle(event(payload))

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({ walletId: 'wallet1', type: 'seedphrase', network: 'testnet' })),
      getCoreAccountXpub: jest.fn(async () => XPUB)
    }
    assetLockFundingAddressesRepository = {}

    assetLockFunding = {
      fundFromWallet: jest.fn(async () => ({
        fundingTxid: 'b'.repeat(64), paid: true, feeDuffs: 226n, changeDuffs: 0n
      }))
    }
    requestAssetLockFundingAddress = { handle: jest.fn(async () => ({ address: FUNDING_ADDRESS })) }
    shieldFromCore = { handle: jest.fn(async () => shieldedResult) }

    sdk = {}
    shielded = { validateMemo: jest.fn(() => null), validateAccount: jest.fn(() => null) }

    handler = new ShieldFromWalletHandler(
      walletRepository,
      assetLockFundingAddressesRepository,
      assetLockFunding,
      requestAssetLockFundingAddress,
      shieldFromCore,
      sdk,
      shielded
    )
  })

  it('reserves a funding address, pays it from the wallet and hands the deposit on', async () => {
    const order: string[] = []

    requestAssetLockFundingAddress.handle.mockImplementation(async () => {
      order.push('requestFundingAddress')
      return { address: FUNDING_ADDRESS }
    })
    assetLockFunding.fundFromWallet.mockImplementation(async () => {
      order.push('fund')
      return { fundingTxid: 'b'.repeat(64), paid: true, feeDuffs: 226n, changeDuffs: 0n }
    })
    shieldFromCore.handle.mockImplementation(async () => {
      order.push('shield')
      return shieldedResult
    })

    const response = await handle()

    expect(order).toEqual(['requestFundingAddress', 'fund', 'shield'])
    expect(response).toEqual({
      ...shieldedResult,
      fundingAddress: FUNDING_ADDRESS,
      fundingTxid: 'b'.repeat(64),
      coreFeeDuffs: '226'
    })
  })

  it('asks for a funding address of its own purpose', async () => {
    await handle()

    expect(requestAssetLockFundingAddress.handle).toHaveBeenCalledWith(expect.objectContaining({
      payload: { purpose: 'shield' }
    }))
  })

  it('passes the deposit and the shielded options to the Core to pool step', async () => {
    await handle({ amountDuffs: '250000000', password: 'test', toShieldedAddress: 'tdashshielded1other', memo: 'hi', account: 0 })

    expect(assetLockFunding.fundFromWallet).toHaveBeenCalledWith(expect.objectContaining({
      xpub: XPUB, fundingAddress: FUNDING_ADDRESS, amountDuffs: 250_000_000n, password: 'test'
    }))
    expect(shieldFromCore.handle).toHaveBeenCalledWith(expect.objectContaining({
      payload: {
        assetLockFundingAddress: FUNDING_ADDRESS,
        assetLockFundingTxid: 'b'.repeat(64),
        password: 'test',
        toShieldedAddress: 'tdashshielded1other',
        memo: 'hi',
        account: 0
      }
    }))
  })

  it('refuses a wallet with no seed phrase to pay from', async () => {
    walletRepository.getCurrent.mockResolvedValue({ walletId: 'wallet1', type: 'keystore', network: 'testnet' })

    await expect(handle()).rejects.toThrow('only supported for a seedphrase wallet')
    expect(requestAssetLockFundingAddress.handle).not.toHaveBeenCalled()
  })

  it('throws when no wallet is chosen', async () => {
    walletRepository.getCurrent.mockResolvedValue(null)

    await expect(handle()).rejects.toThrow('No wallet is chosen')
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
