import { ShieldToPoolHandler, SHIELD_TO_POOL_STAGES } from '../../../../src/content-script/api/private/wallet/shieldToPool'
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
  const source = {
    index: 0,
    platformAddress: 'yShieldSource',
    nonce: 3,
    balanceCredits: 100_000_000n
  }

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

    buildPlatformSourceCandidatesMock.mockResolvedValue([] as any)
    selectPlatformSourceMock.mockReturnValue(source as any)
    decryptMnemonicMock.mockReturnValue('mnemonic words')

    handler = new ShieldToPoolHandler(walletRepository, sdk)
  })

  const handle = async (ctx?: { onProgress: (stage: string) => void }): Promise<any> => {
    return await handler.handle({
      context: 'dash-platform-extension',
      id: 'id',
      method: 'SHIELD_TO_POOL',
      type: 'request',
      payload: { amountCredits: '1000', password }
    }, ctx)
  }

  test('shields with full happy-path flow', async () => {
    const result = await handle()

    expect(result).toEqual({
      stHash: 'stHash',
      amountCredits: '1000',
      fromAddress: source.platformAddress
    })
    expect(sdk.shielded.createStateTransition).toHaveBeenCalled()
    expect(sdk.stateTransitions.broadcast).toHaveBeenCalled()
    expect(sdk.stateTransitions.waitForStateTransitionResult).toHaveBeenCalled()
    expect(order).toEqual(['prove', 'broadcast', 'wait'])
  })

  test('reports progress stages in execution order, with proving before broadcast', async () => {
    const stages: string[] = []

    await handle({ onProgress: (stage) => { stages.push(stage) } })

    expect(stages).toEqual([
      SHIELD_TO_POOL_STAGES.preparing,
      SHIELD_TO_POOL_STAGES.proving,
      SHIELD_TO_POOL_STAGES.broadcasting,
      SHIELD_TO_POOL_STAGES.confirming
    ])
  })

  test('works without a progress context (in-popup path)', async () => {
    await expect(handle()).resolves.toBeDefined()
  })

  test('does not reach the proving stage when no wallet is chosen', async () => {
    walletRepository.getCurrent.mockResolvedValueOnce(null)
    const stages: string[] = []

    await expect(handle({ onProgress: (stage) => { stages.push(stage) } }))
      .rejects.toThrow('No wallet is chosen')

    expect(stages).toEqual([SHIELD_TO_POOL_STAGES.preparing])
    expect(sdk.shielded.createStateTransition).not.toHaveBeenCalled()
  })
})
