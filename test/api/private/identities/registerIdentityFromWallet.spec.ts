import { RegisterIdentityFromWalletHandler } from '../../../../src/content-script/api/private/identities/registerIdentityFromWallet'
import { WalletType } from '../../../../src/types/WalletType'
import { deriveCoreAccountXpub } from '../../../../src/utils/coreAddresses'

jest.mock('../../../../src/utils/coreAddresses', () => {
  const actual = jest.requireActual('../../../../src/utils/coreAddresses')
  return {
    ...actual,
    deriveCoreAccountXpub: jest.fn()
  }
})

const deriveCoreAccountXpubMock = deriveCoreAccountXpub as jest.MockedFunction<typeof deriveCoreAccountXpub>

const FUNDING_ADDRESS = 'yFundingAddress'
const IDENTIFIER = 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'
const XPUB = 'tpubAccountXpub'

describe('RegisterIdentityFromWalletHandler', () => {
  let walletRepository: any
  let assetLockFundingAddressesRepository: any
  let assetLockFunding: any
  let requestAssetLockFundingAddress: any
  let registerIdentity: any
  let sdk: any
  let handler: RegisterIdentityFromWalletHandler

  const event = (payload: any): any => ({ id: '1', context: 'dash-platform-extension', method: 'REGISTER_IDENTITY_FROM_WALLET', type: 'request', payload })

  const handle = async (payload: any = { amountDuffs: '100000000', password: 'test' }): Promise<any> =>
    await handler.handle(event(payload))

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({ walletId: 'wallet1', type: WalletType.seedphrase, network: 'testnet' })),
      getCoreAccountXpub: jest.fn(async () => XPUB)
    }
    assetLockFundingAddressesRepository = {}

    assetLockFunding = {
      fundFromWallet: jest.fn(async () => ({
        fundingTxid: 'b'.repeat(64), paid: true, feeDuffs: 226n, changeDuffs: 0n
      }))
    }
    requestAssetLockFundingAddress = { handle: jest.fn(async () => ({ address: FUNDING_ADDRESS })) }
    registerIdentity = {
      handle: jest.fn(async () => ({
        identifier: IDENTIFIER,
        stateTransitionHash: 'a'.repeat(64),
        assetLockTxid: 'c'.repeat(64)
      }))
    }

    sdk = {}

    handler = new RegisterIdentityFromWalletHandler(
      walletRepository,
      assetLockFundingAddressesRepository,
      assetLockFunding,
      requestAssetLockFundingAddress,
      registerIdentity,
      sdk
    )
  })

  it('reserves a funding address, pays it from the wallet and registers the identity', async () => {
    const order: string[] = []

    requestAssetLockFundingAddress.handle.mockImplementation(async () => {
      order.push('requestFundingAddress')
      return { address: FUNDING_ADDRESS }
    })
    assetLockFunding.fundFromWallet.mockImplementation(async () => {
      order.push('fund')
      return { fundingTxid: 'b'.repeat(64), paid: true, feeDuffs: 226n, changeDuffs: 0n }
    })
    registerIdentity.handle.mockImplementation(async () => {
      order.push('register')
      return { identifier: IDENTIFIER, stateTransitionHash: 'a'.repeat(64), assetLockTxid: 'c'.repeat(64) }
    })

    const response = await handle()

    expect(order).toEqual(['requestFundingAddress', 'fund', 'register'])
    expect(response).toEqual({
      identifier: IDENTIFIER,
      stateTransitionHash: 'a'.repeat(64),
      assetLockTxid: 'c'.repeat(64),
      fundingAddress: FUNDING_ADDRESS,
      fundingTxid: 'b'.repeat(64),
      coreFeeDuffs: '226'
    })
  })

  it('asks for an address of the registration pool', async () => {
    await handle()

    expect(requestAssetLockFundingAddress.handle).toHaveBeenCalledWith(expect.objectContaining({
      payload: { purpose: 'registration' }
    }))
  })

  it('hands the deposit it paid to the registration step', async () => {
    await handle({ amountDuffs: '250000000', password: 'test' })

    expect(assetLockFunding.fundFromWallet).toHaveBeenCalledWith(expect.objectContaining({
      xpub: XPUB, account: 0, fundingAddress: FUNDING_ADDRESS, amountDuffs: 250_000_000n, password: 'test'
    }))
    expect(registerIdentity.handle).toHaveBeenCalledWith(expect.objectContaining({
      payload: {
        assetLockFundingAddress: FUNDING_ADDRESS,
        assetLockFundingTxid: 'b'.repeat(64),
        password: 'test'
      }
    }))
  })

  it('derives the core xpub when the wallet has none cached', async () => {
    walletRepository.getCoreAccountXpub.mockResolvedValue(null)
    deriveCoreAccountXpubMock.mockResolvedValue('tpubDerivedOnTheSpot')

    await handle()

    expect(deriveCoreAccountXpubMock).toHaveBeenCalled()
    expect(assetLockFunding.fundFromWallet).toHaveBeenCalledWith(expect.objectContaining({
      xpub: 'tpubDerivedOnTheSpot'
    }))
  })

  it('refuses a wallet with no seed phrase to pay from', async () => {
    walletRepository.getCurrent.mockResolvedValue({ walletId: 'wallet1', type: WalletType.keystore, network: 'testnet' })

    await expect(handle()).rejects.toThrow('only supported for seedphrase wallets')
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

    it('rejects an amount that leaves nothing to lock', () => {
      expect(handler.validatePayload({ amountDuffs: '1000', password: 'test' })).toMatch(/asset lock fee/)
    })

    it('rejects a non-integer amount and a missing password', () => {
      expect(handler.validatePayload({ amountDuffs: '1.5', password: 'test' })).toMatch(/positive integer/)
      expect(handler.validatePayload({ amountDuffs: '100000000', password: '' })).toMatch(/password/)
    })
  })
})
