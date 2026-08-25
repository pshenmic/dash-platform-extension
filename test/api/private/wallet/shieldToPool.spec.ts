import { ShieldToPoolHandler } from '../../../../src/content-script/api/private/wallet/shieldToPool'
import { buildPlatformSourceCandidates, decryptMnemonic, selectPlatformSource } from '../../../../src/utils'

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    buildPlatformSourceCandidates: jest.fn(),
    selectPlatformSource: jest.fn(),
    decryptMnemonic: jest.fn()
  }
})

// Keep the real pshenmic-dpp (dash-platform-sdk pulls PLATFORM_V12 etc. from it)
// and only stub the two WASM constructors the handler builds, so no address /
// proof WASM validation runs in the test.
jest.mock('pshenmic-dpp', () => {
  const actual = jest.requireActual('pshenmic-dpp')
  return {
    ...actual,
    InputAddressWASM: jest.fn().mockImplementation((platformAddress, nonce, balance) => ({ platformAddress, nonce, balance })),
    AddressFundsFeeStrategyStepWASM: {
      ...actual.AddressFundsFeeStrategyStepWASM,
      DeductFromInput: jest.fn((index) => ({ deductFromInput: index }))
    }
  }
})

const buildPlatformSourceCandidatesMock = buildPlatformSourceCandidates as jest.MockedFunction<typeof buildPlatformSourceCandidates>
const selectPlatformSourceMock = selectPlatformSource as jest.MockedFunction<typeof selectPlatformSource>
const decryptMnemonicMock = decryptMnemonic as jest.MockedFunction<typeof decryptMnemonic>

describe('ShieldToPoolHandler', () => {
  const password = 'test'
  const candidates = [{ index: 0, platformAddress: 'yShieldSource', nonce: 3, balanceCredits: 100_000_000n }]
  const source = candidates[0]

  let order: string[]
  let walletRepository: any
  let sdk: any
  let handler: ShieldToPoolHandler

  beforeEach(() => {
    jest.clearAllMocks()

    order = []

    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1',
        type: 'seedphrase',
        network: 'testnet',
        label: null,
        encryptedMnemonic: 'encryptedMnemonic',
        seedHash: 'seedHash',
        currentIdentity: null
      })),
      getPlatformAccountXpub: jest.fn(async () => 'xpub'),
      getPlatformAddressCount: jest.fn(async () => 1)
    }

    sdk = {
      keyPair: {
        mnemonicToSeed: jest.fn(() => new Uint8Array([1, 2, 3])),
        derivePlatformAddressPrivateKey: jest.fn(async () => 'privateKey'),
        deriveShieldedAddress: jest.fn(() => 'shieldedRecipient'),
        deriveShieldedOutgoingViewingKey: jest.fn(() => 'ovk')
      },
      shielded: {
        createStateTransition: jest.fn(async () => {
          order.push('prove')
          return { hash: jest.fn(() => 'stHash') }
        })
      },
      stateTransitions: {
        broadcast: jest.fn(async () => {
          order.push('broadcast')
        }),
        waitForStateTransitionResult: jest.fn(async () => {
          order.push('wait')
        })
      }
    }

    buildPlatformSourceCandidatesMock.mockResolvedValue(candidates as any)
    selectPlatformSourceMock.mockReturnValue(source as any)
    decryptMnemonicMock.mockReturnValue('mnemonic words')

    handler = new ShieldToPoolHandler(walletRepository, sdk)
  })

  const handle = async (payload: any = {}): Promise<any> => {
    return await handler.handle({
      context: 'dash-platform-extension',
      id: 'id',
      method: 'SHIELD_TO_POOL',
      type: 'request',
      payload: { amountCredits: '1000', password, ...payload }
    })
  }

  test('shields into the wallet own pool and returns the state transition hash', async () => {
    const result = await handle()

    expect(result).toEqual({
      stHash: 'stHash',
      amountCredits: '1000',
      fromAddress: source.platformAddress
    })
    expect(order).toEqual(['prove', 'broadcast', 'wait'])
  })

  test('builds the shield transition from the selected source with its next nonce', async () => {
    await handle({ memo: 'note' })

    expect(sdk.keyPair.derivePlatformAddressPrivateKey).toHaveBeenCalledWith(expect.anything(), 'testnet', 0, source.index)
    expect(sdk.shielded.createStateTransition).toHaveBeenCalledWith('shield', expect.objectContaining({
      recipient: 'shieldedRecipient',
      shieldAmount: 1000n,
      senderOvk: 'ovk',
      memo: 'note',
      inputs: [expect.objectContaining({ platformAddress: source.platformAddress, nonce: source.nonce + 1 })]
    }))
  })

  test('passes an explicit fromAddress to the source selection', async () => {
    await handle({ fromAddress: 'yPinnedSource' })

    expect(selectPlatformSourceMock).toHaveBeenCalledWith(candidates, 1000n, 'yPinnedSource')
  })

  test('treats an empty fromAddress as no preference', async () => {
    await handle({ fromAddress: '' })

    expect(selectPlatformSourceMock).toHaveBeenCalledWith(candidates, 1000n, undefined)
  })

  test('throws when no wallet is chosen', async () => {
    walletRepository.getCurrent.mockResolvedValueOnce(null)

    await expect(handle()).rejects.toThrow('No wallet is chosen')
    expect(sdk.shielded.createStateTransition).not.toHaveBeenCalled()
  })

  test('throws for a non-seedphrase wallet', async () => {
    walletRepository.getCurrent.mockResolvedValueOnce({ walletId: 'wallet1', type: 'keystore', network: 'testnet' })

    await expect(handle()).rejects.toThrow('Shielding is only supported for a seedphrase wallet')
  })

  test('throws when the platform xpub is not initialized', async () => {
    walletRepository.getPlatformAccountXpub.mockResolvedValueOnce(null)

    await expect(handle()).rejects.toThrow('Platform xpub is not initialized')
  })

  test('throws when no platform addresses were created yet', async () => {
    walletRepository.getPlatformAddressCount.mockResolvedValueOnce(0)

    await expect(handle()).rejects.toThrow('No Platform addresses have been created yet')
    expect(buildPlatformSourceCandidatesMock).not.toHaveBeenCalled()
  })

  describe('validatePayload', () => {
    test('accepts a valid payload', () => {
      expect(handler.validatePayload({ amountCredits: '1000', password } as any)).toBeNull()
    })

    test('rejects a non-positive or malformed amount', () => {
      expect(handler.validatePayload({ amountCredits: '0', password } as any)).toBe('Amount must be a positive integer string of credits')
      expect(handler.validatePayload({ amountCredits: '10.5', password } as any)).toBe('Amount must be a positive integer string of credits')
      expect(handler.validatePayload({ amountCredits: 1000, password } as any)).toBe('Amount must be a positive integer string of credits')
    })

    test('rejects a missing password', () => {
      expect(handler.validatePayload({ amountCredits: '1000', password: '' } as any)).toBe('Password must be provided')
    })

    test('rejects non-string fromAddress and memo', () => {
      expect(handler.validatePayload({ amountCredits: '1000', password, fromAddress: 1 } as any)).toBe('fromAddress must be a string')
      expect(handler.validatePayload({ amountCredits: '1000', password, memo: 1 } as any)).toBe('memo must be a string')
    })
  })
})
