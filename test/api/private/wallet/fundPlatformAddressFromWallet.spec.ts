import { FundPlatformAddressFromWalletHandler } from '../../../../src/content-script/api/private/wallet/fundPlatformAddressFromWallet'

// Keep the real pshenmic-dpp and only stub the address parsing the handler does.
jest.mock('pshenmic-dpp', () => {
  const actual = jest.requireActual('pshenmic-dpp')
  return {
    ...actual,
    PlatformAddressWASM: { ...actual.PlatformAddressWASM, fromBech32m: jest.fn((address) => ({ address })) }
  }
})

const PLATFORM_ADDRESS = 'tdash1kr2vwm6pp4ea25y8mvllgd0798g9t6z7mqah9t4h'
const FUNDING_ADDRESS = 'yFundingAddress'
const XPUB = 'tpubAccountXpub'

describe('FundPlatformAddressFromWalletHandler', () => {
  let walletRepository: any
  let assetLockFundingAddressesRepository: any
  let pendingAssetLocksRepository: any
  let assetLockFunding: any
  let requestAssetLockFundingAddress: any
  let fundPlatformAddressFromCore: any
  let sdk: any
  let handler: FundPlatformAddressFromWalletHandler

  const event = (payload: any): any => ({ id: '1', context: 'dash-platform-extension', method: 'FUND_PLATFORM_ADDRESS_FROM_WALLET', type: 'request', payload })

  const handle = async (payload: any = { platformAddress: PLATFORM_ADDRESS, amountDuffs: '100000', password: 'test' }): Promise<any> =>
    await handler.handle(event(payload))

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({ walletId: 'wallet1', type: 'seedphrase', network: 'testnet' })),
      getCoreAccountXpub: jest.fn(async () => XPUB)
    }
    assetLockFundingAddressesRepository = {}
    pendingAssetLocksRepository = { getAll: jest.fn(async () => []) }

    assetLockFunding = {
      fundFromWallet: jest.fn(async () => ({
        fundingTxid: 'b'.repeat(64), paid: true, feeDuffs: 226n, changeDuffs: 89_774n
      }))
    }
    requestAssetLockFundingAddress = { handle: jest.fn(async () => ({ address: FUNDING_ADDRESS })) }
    fundPlatformAddressFromCore = {
      handle: jest.fn(async () => ({
        platformAddress: PLATFORM_ADDRESS,
        stateTransitionHash: 'a'.repeat(64),
        assetLockTxid: 'c'.repeat(64)
      }))
    }

    sdk = {}

    handler = new FundPlatformAddressFromWalletHandler(
      walletRepository,
      assetLockFundingAddressesRepository,
      pendingAssetLocksRepository,
      assetLockFunding,
      requestAssetLockFundingAddress,
      fundPlatformAddressFromCore,
      sdk
    )
  })

  it('reserves a funding address, pays it from the wallet and credits the platform address', async () => {
    const order: string[] = []

    requestAssetLockFundingAddress.handle.mockImplementation(async () => {
      order.push('requestFundingAddress')
      return { address: FUNDING_ADDRESS }
    })
    assetLockFunding.fundFromWallet.mockImplementation(async () => {
      order.push('fund')
      return { fundingTxid: 'b'.repeat(64), paid: true, feeDuffs: 226n, changeDuffs: 89_774n }
    })
    fundPlatformAddressFromCore.handle.mockImplementation(async () => {
      order.push('credit')
      return { platformAddress: PLATFORM_ADDRESS, stateTransitionHash: 'a'.repeat(64), assetLockTxid: 'c'.repeat(64) }
    })

    const response = await handle()

    expect(order).toEqual(['requestFundingAddress', 'fund', 'credit'])
    expect(response).toEqual({
      platformAddress: PLATFORM_ADDRESS,
      stateTransitionHash: 'a'.repeat(64),
      assetLockTxid: 'c'.repeat(64),
      fundingAddress: FUNDING_ADDRESS,
      fundingTxid: 'b'.repeat(64),
      coreFeeDuffs: '226',
      resumed: false
    })
  })

  it('finishes an unfinished funding of this address instead of paying again', async () => {
    pendingAssetLocksRepository.getAll.mockResolvedValue([{
      assetLockTxid: 'd'.repeat(64),
      fundingAddress: 'yEarlierAddress',
      fundingTxid: 'e'.repeat(64),
      purpose: 'fundAddress',
      identityId: null,
      platformAddress: PLATFORM_ADDRESS,
      shieldedAddress: null,
      amountDuffs: '99999000',
      createdAt: 1000
    }])

    const response = await handle()

    expect(requestAssetLockFundingAddress.handle).not.toHaveBeenCalled()
    expect(assetLockFunding.fundFromWallet).not.toHaveBeenCalled()
    expect(fundPlatformAddressFromCore.handle).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        assetLockFundingAddress: 'yEarlierAddress',
        assetLockFundingTxid: 'e'.repeat(64)
      })
    }))
    expect(response).toMatchObject({ resumed: true, coreFeeDuffs: '0' })
  })

  it('leaves an unfinished funding of another address alone', async () => {
    pendingAssetLocksRepository.getAll.mockResolvedValue([{
      assetLockTxid: 'd'.repeat(64),
      fundingAddress: 'yEarlierAddress',
      fundingTxid: 'e'.repeat(64),
      purpose: 'fundAddress',
      identityId: null,
      platformAddress: 'tdash1someoneelse',
      shieldedAddress: null,
      amountDuffs: '99999000',
      createdAt: 1000
    }])

    const response = await handle()

    expect(assetLockFunding.fundFromWallet).toHaveBeenCalled()
    expect(response.resumed).toBe(false)
  })

  it('asks for an address of its own purpose, not one a registration waits on', async () => {
    await handle()

    expect(requestAssetLockFundingAddress.handle).toHaveBeenCalledWith(expect.objectContaining({
      payload: { purpose: 'fundAddress', recipient: PLATFORM_ADDRESS }
    }))
  })

  it('hands the deposit it paid to the Core to Platform step', async () => {
    await handle({ platformAddress: PLATFORM_ADDRESS, amountDuffs: '250000', password: 'test' })

    expect(assetLockFunding.fundFromWallet).toHaveBeenCalledWith(expect.objectContaining({
      xpub: XPUB, account: 0, fundingAddress: FUNDING_ADDRESS, amountDuffs: 250_000n
    }))
    expect(fundPlatformAddressFromCore.handle).toHaveBeenCalledWith(expect.objectContaining({
      payload: {
        platformAddress: PLATFORM_ADDRESS,
        assetLockFundingAddress: FUNDING_ADDRESS,
        assetLockFundingTxid: 'b'.repeat(64),
        password: 'test'
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
      expect(handler.validatePayload({ platformAddress: PLATFORM_ADDRESS, amountDuffs: '100000', password: 'test' })).toBeNull()
    })

    it('rejects an amount that leaves nothing to lock', () => {
      expect(handler.validatePayload({ platformAddress: PLATFORM_ADDRESS, amountDuffs: '1000', password: 'test' })).toMatch(/asset lock fee/)
    })

    it('rejects a missing address or password', () => {
      expect(handler.validatePayload({ platformAddress: '', amountDuffs: '100000', password: 'test' })).toMatch(/platformAddress/)
      expect(handler.validatePayload({ platformAddress: PLATFORM_ADDRESS, amountDuffs: '100000', password: '' })).toMatch(/password/)
    })
  })
})
