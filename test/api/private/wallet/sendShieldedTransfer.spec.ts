import { SendShieldedTransferHandler } from '../../../../src/content-script/api/private/wallet/sendShieldedTransfer'
import { decryptMnemonic, prepareShieldedSpend } from '../../../../src/utils'
import { SHIELDED_SPEND_FEE_CREDITS } from '../../../../src/constants'

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    decryptMnemonic: jest.fn(),
    prepareShieldedSpend: jest.fn()
  }
})

// Keep the real pshenmic-dpp (dash-platform-sdk needs PLATFORM_V12 etc.) and only
// stub the address parser the handler calls.
jest.mock('pshenmic-dpp', () => {
  const actual = jest.requireActual('pshenmic-dpp')
  return {
    ...actual,
    OrchardAddressWASM: { ...actual.OrchardAddressWASM, fromBech32m: jest.fn((addr) => ({ addr })) }
  }
})

const decryptMnemonicMock = decryptMnemonic as jest.MockedFunction<typeof decryptMnemonic>
const prepareShieldedSpendMock = prepareShieldedSpend as jest.MockedFunction<typeof prepareShieldedSpend>

const TO_ADDRESS = 'orchardRecipient'
const SOURCE_ADDRESS = 'orchardSource0'

describe('SendShieldedTransferHandler', () => {
  let walletRepository: any
  let sdk: any
  let handler: SendShieldedTransferHandler

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1',
        type: 'seedphrase',
        network: 'testnet',
        label: null,
        encryptedMnemonic: 'encryptedMnemonic',
        seedHash: 'seedHash',
        currentIdentity: null
      }))
    }

    sdk = {
      keyPair: { mnemonicToSeed: jest.fn(() => new Uint8Array([1, 2, 3])) },
      shielded: { createStateTransition: jest.fn(async () => ({ hash: jest.fn(() => 'stHash') })) },
      stateTransitions: {
        broadcast: jest.fn(async () => {}),
        waitForStateTransitionResult: jest.fn(async () => {})
      }
    }

    decryptMnemonicMock.mockReturnValue('mnemonic words')
    prepareShieldedSpendMock.mockResolvedValue({
      spends: [],
      anchor: new Uint8Array([9]),
      changeAddress: {} as any,
      coinType: 1
    })

    handler = new SendShieldedTransferHandler(walletRepository, sdk)
  })

  const handle = async (payload: any): Promise<any> => {
    return await handler.handle({
      context: 'dash-platform-extension',
      id: 'id',
      method: 'SEND_SHIELDED_TRANSFER',
      type: 'request',
      payload
    })
  }

  it('passes the requested source addresses through to prepareShieldedSpend', async () => {
    const result = await handle({
      toShieldedAddress: TO_ADDRESS,
      amountCredits: '1000',
      password: 'test',
      fromAddresses: [SOURCE_ADDRESS]
    })

    expect(result).toEqual({ stHash: 'stHash', amountCredits: '1000', toShieldedAddress: TO_ADDRESS })
    expect(prepareShieldedSpendMock).toHaveBeenCalledWith(
      sdk,
      expect.any(Uint8Array),
      'testnet',
      0,
      1000n + SHIELDED_SPEND_FEE_CREDITS,
      [SOURCE_ADDRESS]
    )
  })

  it('passes undefined source addresses when none are requested (whole account)', async () => {
    await handle({ toShieldedAddress: TO_ADDRESS, amountCredits: '1000', password: 'test' })

    expect(prepareShieldedSpendMock).toHaveBeenCalledWith(
      sdk,
      expect.any(Uint8Array),
      'testnet',
      0,
      1000n + SHIELDED_SPEND_FEE_CREDITS,
      undefined
    )
  })

  describe('validatePayload', () => {
    const base = { toShieldedAddress: TO_ADDRESS, amountCredits: '1000', password: 'test' }

    it('accepts a valid fromAddresses array', () => {
      expect(handler.validatePayload({ ...base, fromAddresses: [SOURCE_ADDRESS] })).toBeNull()
    })

    it('accepts an absent fromAddresses', () => {
      expect(handler.validatePayload(base as any)).toBeNull()
    })

    it('rejects an empty fromAddresses array', () => {
      expect(handler.validatePayload({ ...base, fromAddresses: [] }))
        .toBe('fromAddresses must be a non-empty array of addresses')
    })

    it('rejects non-string entries in fromAddresses', () => {
      expect(handler.validatePayload({ ...base, fromAddresses: [SOURCE_ADDRESS, ''] }))
        .toBe('fromAddresses must contain only non-empty address strings')
    })
  })
})
