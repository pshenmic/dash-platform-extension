import { IdentityCreditTransferToAddressesHandler } from '../../../../src/content-script/api/private/wallet/identityCreditTransferToAddresses'
import { deriveIdentityPrivateKey, deriveKeystorePrivateKey } from '../../../../src/utils'
import { Purpose } from 'dash-platform-sdk/types'

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    deriveIdentityPrivateKey: jest.fn(),
    deriveKeystorePrivateKey: jest.fn()
  }
})

// Keep the real pshenmic-dpp and only stub the address parsing the handler does.
jest.mock('pshenmic-dpp', () => {
  const actual = jest.requireActual('pshenmic-dpp')
  return {
    ...actual,
    PlatformAddressWASM: { ...actual.PlatformAddressWASM, fromBech32m: jest.fn((address) => ({ address })) },
    OutputAddressWASM: jest.fn((address, amount) => ({ address, amount }))
  }
})

const deriveIdentityPrivateKeyMock = deriveIdentityPrivateKey as jest.MockedFunction<typeof deriveIdentityPrivateKey>
const deriveKeystorePrivateKeyMock = deriveKeystorePrivateKey as jest.MockedFunction<typeof deriveKeystorePrivateKey>

// Valid 32-byte base58 identifiers.
const CURRENT_IDENTITY = '4EfA9Jrvv3nnCFdSf7fad59851iiTRZ6Wcu6YVJ4iSeF'
const OTHER_IDENTITY = 'B7kcE1juMBWEWkuYRJhVdAE2e6RaevrGxRsa1DrLCpQH'
const TO_ADDRESS = 'tdash1kr2vwm6pp4ea25y8mvllgd0798g9t6z7mqah9t4h'

describe('IdentityCreditTransferToAddressesHandler', () => {
  let walletRepository: any
  let identitiesRepository: any
  let keypairRepository: any
  let sdk: any
  let stateTransition: any
  let handler: IdentityCreditTransferToAddressesHandler

  const wallet = (type: string, currentIdentity: string | null = CURRENT_IDENTITY): any => ({
    walletId: 'wallet1',
    type,
    network: 'testnet',
    label: null,
    encryptedMnemonic: 'encryptedMnemonic',
    seedHash: 'seedHash',
    currentIdentity
  })

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = { getCurrent: jest.fn(async () => wallet('keystore')) }

    // The current wallet holds both identities.
    const identities: Record<string, any> = {
      [CURRENT_IDENTITY]: { identifier: CURRENT_IDENTITY, index: 0 },
      [OTHER_IDENTITY]: { identifier: OTHER_IDENTITY, index: 1 }
    }
    identitiesRepository = { getByIdentifier: jest.fn(async (identifier: string) => identities[identifier] ?? null) }
    keypairRepository = {}

    stateTransition = { sign: jest.fn(), hash: jest.fn(() => 'stHash') }
    sdk = {
      identities: {
        getIdentityByIdentifier: jest.fn(async () => ({ getPublicKeys: () => [{ purposeNumber: Purpose.TRANSFER, keyId: 3 }] })),
        getIdentityNonce: jest.fn(async () => 5n)
      },
      platformAddresses: { createStateTransition: jest.fn(() => stateTransition) },
      stateTransitions: {
        broadcast: jest.fn(async () => {}),
        waitForStateTransitionResult: jest.fn(async () => {})
      }
    }

    deriveKeystorePrivateKeyMock.mockResolvedValue('keystoreKey' as any)
    deriveIdentityPrivateKeyMock.mockResolvedValue('seedKey' as any)

    handler = new IdentityCreditTransferToAddressesHandler(walletRepository, identitiesRepository, keypairRepository, sdk)
  })

  const handle = async (payload: any): Promise<any> => {
    return await handler.handle({
      context: 'dash-platform-extension',
      id: 'id',
      method: 'IDENTITY_CREDIT_TRANSFER_TO_ADDRESSES',
      type: 'request',
      payload
    })
  }

  it('sends from the current identity when no sender is given', async () => {
    const result = await handle({ toAddress: TO_ADDRESS, amountCredits: '1000', password: 'test' })

    expect(result.fromIdentity).toBe(CURRENT_IDENTITY)
    expect(sdk.platformAddresses.createStateTransition).toHaveBeenCalledWith('identityCreditTransferToAddresses', expect.objectContaining({ identityId: CURRENT_IDENTITY, nonce: 6n }))
  })

  it('sends from the requested identity, signing with its keystore key', async () => {
    const result = await handle({ toAddress: TO_ADDRESS, amountCredits: '1000', password: 'test', fromIdentity: OTHER_IDENTITY })

    expect(result.fromIdentity).toBe(OTHER_IDENTITY)
    expect(sdk.identities.getIdentityNonce).toHaveBeenCalledWith(OTHER_IDENTITY)
    expect(deriveKeystorePrivateKeyMock).toHaveBeenCalledWith(expect.anything(), 'test', OTHER_IDENTITY, 3, keypairRepository)
    expect(stateTransition.sign).toHaveBeenCalledWith('keystoreKey', expect.objectContaining({ keyId: 3 }))
    expect(sdk.stateTransitions.broadcast).toHaveBeenCalledWith(stateTransition)
  })

  it('derives the requested identity\'s key by its index on a seedphrase wallet', async () => {
    walletRepository.getCurrent.mockResolvedValueOnce(wallet('seedphrase'))

    await handle({ toAddress: TO_ADDRESS, amountCredits: '1000', password: 'test', fromIdentity: OTHER_IDENTITY })

    expect(deriveIdentityPrivateKeyMock).toHaveBeenCalledWith(expect.anything(), 'test', 1, 3, sdk)
  })

  it('works without a selected identity when a sender is given', async () => {
    walletRepository.getCurrent.mockResolvedValueOnce(wallet('keystore', null))

    const result = await handle({ toAddress: TO_ADDRESS, amountCredits: '1000', password: 'test', fromIdentity: OTHER_IDENTITY })

    expect(result.fromIdentity).toBe(OTHER_IDENTITY)
  })

  it('rejects a sender that is not in the current wallet, broadcasting nothing', async () => {
    const foreign = '7UcEKLhVxw6Ng8d6NaXvhyEqqbRfaLFZSU3Vw7uCMLZL'

    await expect(handle({ toAddress: TO_ADDRESS, amountCredits: '1000', password: 'test', fromIdentity: foreign }))
      .rejects.toThrow(`Identity ${foreign} not found`)
    expect(sdk.stateTransitions.broadcast).not.toHaveBeenCalled()
  })

  it('rejects when there is neither a sender nor a selected identity', async () => {
    walletRepository.getCurrent.mockResolvedValueOnce(wallet('keystore', null))

    await expect(handle({ toAddress: TO_ADDRESS, amountCredits: '1000', password: 'test' }))
      .rejects.toThrow('No identity is selected')
  })

  describe('validatePayload', () => {
    const base = { toAddress: TO_ADDRESS, amountCredits: '1000', password: 'test' }

    it('accepts a payload without a sender', () => {
      expect(handler.validatePayload(base)).toBeNull()
    })

    it('accepts a valid sender', () => {
      expect(handler.validatePayload({ ...base, fromIdentity: OTHER_IDENTITY })).toBeNull()
    })

    it('rejects a malformed sender', () => {
      expect(handler.validatePayload({ ...base, fromIdentity: 'not-an-identifier' })).toBe('fromIdentity must be a valid identifier')
    })
  })
})
