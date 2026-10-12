import { SendPlatformTransactionHandler } from '../../../../src/content-script/api/private/wallet/sendPlatformTransaction'
import { EstimatePlatformTransferHandler } from '../../../../src/content-script/api/private/wallet/estimatePlatformTransfer'
import {
  buildPlatformSourceCandidates,
  buildSignedPlatformTransferMulti,
  derivePlatformAddressPrivateKey
} from '../../../../src/utils'

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    buildPlatformSourceCandidates: jest.fn(),
    buildSignedPlatformTransferMulti: jest.fn(),
    derivePlatformAddressPrivateKey: jest.fn()
  }
})

// Keep the real pshenmic-dpp and only stub the address parsing.
jest.mock('pshenmic-dpp', () => {
  const actual = jest.requireActual('pshenmic-dpp')
  return {
    ...actual,
    PlatformAddressWASM: { ...actual.PlatformAddressWASM, fromBech32m: jest.fn((address) => ({ address })) }
  }
})

const buildPlatformSourceCandidatesMock = buildPlatformSourceCandidates as jest.MockedFunction<typeof buildPlatformSourceCandidates>
const buildSignedPlatformTransferMultiMock = buildSignedPlatformTransferMulti as jest.MockedFunction<typeof buildSignedPlatformTransferMulti>
const derivePlatformAddressPrivateKeyMock = derivePlatformAddressPrivateKey as jest.MockedFunction<typeof derivePlatformAddressPrivateKey>

const SOURCE = 'tdash1kr2vwm6pp4ea25y8mvllgd0798g9t6z7mqah9t4h'
const SMALLER = 'tdash1q9m2lwqnqu2lkpz0yfgmfvldrzsyt5plrqpq0z3j'
const ALICE = 'tdash1alice'
const BOB = 'tdash1bob'

// What dpp's fee model charges for one input paying this many recipients.
const FEE_1 = 6_500_000n
const FEE_2 = 12_500_000n

describe('paying several Platform addresses', () => {
  let walletRepository: any
  let sdk: any
  let stateTransition: any
  let send: SendPlatformTransactionHandler
  let estimate: EstimatePlatformTransferHandler

  const event = (payload: any): any => ({ payload })

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({ walletId: 'wallet1', type: 'seedphrase', network: 'testnet' })),
      getPlatformAccountXpub: jest.fn(async () => 'tpubPlatformXpub'),
      getPlatformAddressCount: jest.fn(async () => 2)
    }

    buildPlatformSourceCandidatesMock.mockResolvedValue([
      { platformAddress: SOURCE, derivationPath: "m/9'/1'/17'/0'/0'/0", index: 0, balanceCredits: 500_000_000n, nonce: 3 },
      { platformAddress: SMALLER, derivationPath: "m/9'/1'/17'/0'/0'/1", index: 1, balanceCredits: 20_000_000n, nonce: 0 }
    ])

    stateTransition = { hash: jest.fn(() => 'a'.repeat(64)) }
    buildSignedPlatformTransferMultiMock.mockReturnValue(stateTransition)
    derivePlatformAddressPrivateKeyMock.mockResolvedValue({ key: true } as any)

    sdk = {
      stateTransitions: {
        broadcast: jest.fn(async () => {}),
        waitForStateTransitionResult: jest.fn(async () => {})
      }
    }

    send = new SendPlatformTransactionHandler(walletRepository, sdk)
    estimate = new EstimatePlatformTransferHandler(walletRepository, sdk)
  })

  describe('SendPlatformTransactionHandler', () => {
    const twoOutputs = {
      outputs: [
        { address: ALICE, amountCredits: '10000000' },
        { address: BOB, amountCredits: '20000000' }
      ],
      password: 'test'
    }

    it('pays every recipient from one address in one transition', async () => {
      const response = await send.handle(event(twoOutputs))

      expect(buildSignedPlatformTransferMultiMock).toHaveBeenCalledWith(
        sdk, SOURCE, 3,
        [{ address: ALICE, amountCredits: 10_000_000n }, { address: BOB, amountCredits: 20_000_000n }],
        { key: true }
      )
      expect(sdk.stateTransitions.broadcast).toHaveBeenCalledWith(stateTransition)
      expect(response).toEqual({
        stHash: 'a'.repeat(64),
        amountCredits: '30000000',
        feeCredits: FEE_2.toString(),
        fromAddress: SOURCE,
        outputs: [
          { address: ALICE, amountCredits: '10000000' },
          { address: BOB, amountCredits: '20000000' }
        ]
      })
    })

    it('reserves the fee for the number of recipients, not a flat one', async () => {
      // The smaller address covers the total but not the fee two recipients cost.
      buildPlatformSourceCandidatesMock.mockResolvedValue([
        { platformAddress: SMALLER, derivationPath: "m/9'/1'/17'/0'/0'/1", index: 1, balanceCredits: 30_000_000n + FEE_1, nonce: 0 }
      ])

      await expect(send.handle(event(twoOutputs))).rejects.toThrow('No Platform address holds enough credits')
    })

    it('refuses to pay the address that is paying', async () => {
      await expect(send.handle(event({
        outputs: [{ address: SOURCE, amountCredits: '10000000' }],
        password: 'test'
      }))).rejects.toThrow('Recipient must be different from the source address')
    })

    it('sends from the address the payload names', async () => {
      const response = await send.handle(event({
        outputs: [{ address: ALICE, amountCredits: '10000000' }],
        password: 'test',
        fromAddress: SMALLER
      }))

      expect(response.fromAddress).toBe(SMALLER)
      expect(response.feeCredits).toBe(FEE_1.toString())
    })

    it('refuses a wallet with no seed phrase behind it', async () => {
      walletRepository.getCurrent.mockResolvedValue({ walletId: 'wallet1', type: 'keystore', network: 'testnet' })

      await expect(send.handle(event(twoOutputs))).rejects.toThrow('only supported for a seedphrase wallet')
    })

    describe('validatePayload', () => {
      it('accepts a well formed payload', () => {
        expect(send.validatePayload(twoOutputs)).toBeNull()
      })

      it('rejects an empty list, a repeated address and a dust output', () => {
        expect(send.validatePayload({ outputs: [], password: 'test' })).toMatch(/non-empty/)
        expect(send.validatePayload({
          outputs: [{ address: ALICE, amountCredits: '10000000' }, { address: ALICE, amountCredits: '10000000' }],
          password: 'test'
        })).toMatch(/is repeated/)
        expect(send.validatePayload({ outputs: [{ address: ALICE, amountCredits: '1' }], password: 'test' })).toMatch(/at least/)
      })

      it('rejects a missing password', () => {
        expect(send.validatePayload({ outputs: [{ address: ALICE, amountCredits: '10000000' }], password: '' })).toMatch(/Password/)
      })
    })
  })

  describe('EstimatePlatformTransferHandler', () => {
    it('prices one recipient from the richest address', async () => {
      expect(await estimate.handle(event({}))).toEqual({
        fromAddress: SOURCE,
        feeCredits: FEE_1.toString(),
        balanceCredits: '500000000',
        maxAmountCredits: (500_000_000n - FEE_1).toString(),
        outputCount: 1
      })
    })

    it('charges more for more recipients', async () => {
      const result = await estimate.handle(event({ outputCount: 2 }))

      expect(result.feeCredits).toBe(FEE_2.toString())
      expect(result.maxAmountCredits).toBe((500_000_000n - FEE_2).toString())
    })

    it('describes the address the payload names', async () => {
      const result = await estimate.handle(event({ fromAddress: SMALLER }))

      expect(result.fromAddress).toBe(SMALLER)
      expect(result.maxAmountCredits).toBe((20_000_000n - FEE_1).toString())
    })

    it('reports nothing sendable when the balance cannot cover the fee', async () => {
      buildPlatformSourceCandidatesMock.mockResolvedValue([
        { platformAddress: SMALLER, derivationPath: "m/9'/1'/17'/0'/0'/1", index: 1, balanceCredits: 1_000_000n, nonce: 0 }
      ])

      expect((await estimate.handle(event({}))).maxAmountCredits).toBe('0')
    })

    it('needs no password', async () => {
      await estimate.handle(event({}))

      expect(derivePlatformAddressPrivateKeyMock).not.toHaveBeenCalled()
    })

    it('rejects a nonsense output count', () => {
      expect(estimate.validatePayload({ outputCount: 0 })).toMatch(/positive integer/)
    })
  })
})
