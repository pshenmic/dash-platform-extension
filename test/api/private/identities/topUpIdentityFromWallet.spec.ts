import { TopUpIdentityFromWalletHandler } from '../../../../src/content-script/api/private/identities/topUpIdentityFromWallet'

const IDENTITY_ID = 'GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec'
const FUNDING_ADDRESS = 'yFundingAddress'
const XPUB = 'tpubAccountXpub'

describe('TopUpIdentityFromWalletHandler', () => {
  let walletRepository: any
  let assetLockFundingAddressesRepository: any
  let pendingAssetLocksRepository: any
  let assetLockFunding: any
  let requestTopUpFundingAddress: any
  let topUpIdentity: any
  let sdk: any
  let coreSDK: any
  let handler: TopUpIdentityFromWalletHandler

  const event = (payload: any): any => ({ id: '1', context: 'dash-platform-extension', method: 'TOP_UP_IDENTITY_FROM_WALLET', type: 'request', payload })

  const handle = async (payload: any = { amountDuffs: '100000', password: 'test' }): Promise<any> =>
    await handler.handle(event(payload))

  beforeEach(() => {
    jest.clearAllMocks()

    const wallet = {
      walletId: 'wallet1',
      type: 'seedphrase',
      network: 'testnet',
      currentIdentity: IDENTITY_ID
    }

    walletRepository = {
      getCurrent: jest.fn(async () => wallet),
      getCoreAccountXpub: jest.fn(async () => XPUB),
      forScope: jest.fn(() => walletRepository)
    }
    assetLockFundingAddressesRepository = { forScope: jest.fn(() => assetLockFundingAddressesRepository) }
    pendingAssetLocksRepository = { getAll: jest.fn(async () => []), forScope: jest.fn(() => pendingAssetLocksRepository) }

    assetLockFunding = {
      fundFromWallet: jest.fn(async () => ({
        fundingTxid: 'b'.repeat(64), paid: true, feeDuffs: 226n, changeDuffs: 89_774n
      }))
    }
    requestTopUpFundingAddress = { handle: jest.fn(async () => ({ address: FUNDING_ADDRESS })) }
    topUpIdentity = {
      handle: jest.fn(async () => ({
        identityId: IDENTITY_ID,
        stateTransitionHash: 'a'.repeat(64),
        topUpAmount: '99000000',
        assetLockTxid: 'c'.repeat(64)
      }))
    }

    sdk = { getNetwork: jest.fn(() => 'testnet') }
    coreSDK = { network: 'testnet' }

    handler = new TopUpIdentityFromWalletHandler(
      walletRepository,
      assetLockFundingAddressesRepository,
      pendingAssetLocksRepository,
      assetLockFunding,
      requestTopUpFundingAddress,
      topUpIdentity,
      sdk,
      coreSDK
    )
  })

  it('reserves a funding address, pays it from the wallet and tops the identity up', async () => {
    const order: string[] = []

    requestTopUpFundingAddress.handle.mockImplementation(async () => {
      order.push('requestFundingAddress')
      return { address: FUNDING_ADDRESS }
    })
    assetLockFunding.fundFromWallet.mockImplementation(async () => {
      order.push('fund')
      return { fundingTxid: 'b'.repeat(64), paid: true, feeDuffs: 226n, changeDuffs: 89_774n }
    })
    topUpIdentity.handle.mockImplementation(async () => {
      order.push('topUp')
      return { identityId: IDENTITY_ID, stateTransitionHash: 'a'.repeat(64), topUpAmount: '99000000', assetLockTxid: 'c'.repeat(64) }
    })

    const response = await handle()

    expect(order).toEqual(['requestFundingAddress', 'fund', 'topUp'])
    expect(response).toEqual({
      identityId: IDENTITY_ID,
      stateTransitionHash: 'a'.repeat(64),
      topUpAmount: '99000000',
      assetLockTxid: 'c'.repeat(64),
      fundingAddress: FUNDING_ADDRESS,
      fundingTxid: 'b'.repeat(64),
      coreFeeDuffs: '226',
      resumed: false
    })
  })

  it('finishes an unfinished top-up for this identity instead of paying again', async () => {
    pendingAssetLocksRepository.getAll.mockResolvedValue([{
      assetLockTxid: 'd'.repeat(64),
      fundingAddress: 'yEarlierAddress',
      fundingTxid: 'e'.repeat(64),
      purpose: 'topUp',
      identityId: IDENTITY_ID,
      platformAddress: null,
      shieldedAddress: null,
      amountDuffs: '99999000',
      createdAt: 1000
    }])

    const response = await handle()

    expect(requestTopUpFundingAddress.handle).not.toHaveBeenCalled()
    expect(assetLockFunding.fundFromWallet).not.toHaveBeenCalled()
    expect(topUpIdentity.handle).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        assetLockFundingAddress: 'yEarlierAddress',
        assetLockFundingTxid: 'e'.repeat(64)
      })
    }))
    expect(response).toMatchObject({ resumed: true, coreFeeDuffs: '0', fundingAddress: 'yEarlierAddress' })
  })

  it('leaves an unfinished top-up for another identity alone', async () => {
    pendingAssetLocksRepository.getAll.mockResolvedValue([{
      assetLockTxid: 'd'.repeat(64),
      fundingAddress: 'yEarlierAddress',
      fundingTxid: 'e'.repeat(64),
      purpose: 'topUp',
      identityId: '2Pzr4eUaDEdPzNYLZWsMJHpDTpBxJcM2LCMg2cQhLfoQ',
      platformAddress: null,
      shieldedAddress: null,
      amountDuffs: '99999000',
      createdAt: 1000
    }])

    const response = await handle()

    expect(assetLockFunding.fundFromWallet).toHaveBeenCalled()
    expect(response.resumed).toBe(false)
  })

  it('pays the amount it was given to the address it reserved', async () => {
    await handle({ amountDuffs: '250000', password: 'test' })

    expect(assetLockFunding.fundFromWallet).toHaveBeenCalledWith(expect.objectContaining({
      xpub: XPUB,
      account: 0,
      fundingAddress: FUNDING_ADDRESS,
      amountDuffs: 250_000n,
      password: 'test'
    }))
  })

  it('tops up the wallet current identity when the payload names none', async () => {
    await handle()

    expect(requestTopUpFundingAddress.handle).toHaveBeenCalledWith(expect.objectContaining({
      payload: { password: 'test', identityId: IDENTITY_ID, walletId: 'wallet1', network: 'testnet' }
    }))
  })

  it('tops up any identity the payload names', async () => {
    const foreign = '2Pzr4eUaDEdPzNYLZWsMJHpDTpBxJcM2LCMg2cQhLfoQ'

    await handle({ identityId: foreign, amountDuffs: '100000', password: 'test' })

    expect(topUpIdentity.handle).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ identityId: foreign })
    }))
  })

  it('binds every step to one (network, wallet) pair', async () => {
    await handle({ amountDuffs: '100000', password: 'test', walletId: 'wallet1', network: 'testnet' })

    expect(walletRepository.forScope).toHaveBeenCalledWith({ network: 'testnet', walletId: 'wallet1' })
    expect(assetLockFundingAddressesRepository.forScope).toHaveBeenCalledWith({ network: 'testnet', walletId: 'wallet1' })
    expect(topUpIdentity.handle).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ walletId: 'wallet1', network: 'testnet' })
    }))
  })

  it('refuses to spend anything when this context is on another network', async () => {
    sdk.getNetwork.mockReturnValue('mainnet')

    await expect(handle({ amountDuffs: '100000', password: 'test', walletId: 'wallet1', network: 'testnet' }))
      .rejects.toThrow('reopen the top-up page')
    expect(assetLockFunding.fundFromWallet).not.toHaveBeenCalled()
  })

  it('refuses a wallet with no seed phrase to pay from', async () => {
    walletRepository.getCurrent.mockResolvedValue({ walletId: 'wallet1', type: 'keystore', network: 'testnet' })

    await expect(handle()).rejects.toThrow('only supported for a seedphrase wallet')
    expect(requestTopUpFundingAddress.handle).not.toHaveBeenCalled()
  })

  it('throws when no identity is chosen and none is named', async () => {
    walletRepository.getCurrent.mockResolvedValue({ walletId: 'wallet1', type: 'seedphrase', network: 'testnet', currentIdentity: null })

    await expect(handle()).rejects.toThrow('No identity is chosen to top up')
  })

  describe('validatePayload', () => {
    it('accepts a well formed payload', () => {
      expect(handler.validatePayload({ amountDuffs: '100000', password: 'test' })).toBeNull()
    })

    it('rejects an amount that leaves nothing to lock', () => {
      expect(handler.validatePayload({ amountDuffs: '1000', password: 'test' })).toMatch(/asset lock fee/)
      expect(handler.validatePayload({ amountDuffs: '0', password: 'test' })).toMatch(/asset lock fee/)
    })

    it('rejects a non-integer amount and a missing password', () => {
      expect(handler.validatePayload({ amountDuffs: '0.5', password: 'test' })).toMatch(/positive integer/)
      expect(handler.validatePayload({ amountDuffs: '100000', password: '' })).toMatch(/password/)
    })

    it('rejects a payload naming only one half of the pair', () => {
      expect(handler.validatePayload({ amountDuffs: '100000', password: 'test', walletId: 'wallet1' })).not.toBeNull()
    })
  })
})
