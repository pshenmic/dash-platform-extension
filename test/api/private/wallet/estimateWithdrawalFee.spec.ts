import { EstimateWithdrawalFeeHandler } from '../../../../src/content-script/api/private/wallet/estimateWithdrawalFee'
import { buildPlatformSourceCandidates } from '../../../../src/utils'
import { MIN_WITHDRAWAL_CREDITS } from '../../../../src/constants'

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    buildPlatformSourceCandidates: jest.fn()
  }
})

const buildPlatformSourceCandidatesMock = buildPlatformSourceCandidates as jest.MockedFunction<typeof buildPlatformSourceCandidates>

const IDENTITY_ID = 'GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec'
const OTHER_IDENTITY = '2Pzr4eUaDEdPzNYLZWsMJHpDTpBxJcM2LCMg2cQhLfoQ'
const ADDRESS_A = 'tdash1kr2vwm6pp4ea25y8mvllgd0798g9t6z7mqah9t4h'
const ADDRESS_B = 'tdash1q9m2lwqnqu2lkpz0yfgmfvldrzsyt5plrqpq0z3j'

// The fees the dpp fee model reports for these two transitions.
const IDENTITY_FEE = 400_000_000n
const ADDRESS_FEE = 400_500_000n

describe('EstimateWithdrawalFeeHandler', () => {
  let walletRepository: any
  let sdk: any
  let handler: EstimateWithdrawalFeeHandler

  const event = (payload: any): any => ({ payload })

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1', type: 'seedphrase', network: 'testnet', currentIdentity: IDENTITY_ID
      })),
      getPlatformAccountXpub: jest.fn(async () => 'tpubPlatformXpub'),
      getPlatformAddressCount: jest.fn(async () => 3)
    }

    sdk = { identities: { getIdentityBalance: jest.fn(async () => 1_000_000_000n) } }

    buildPlatformSourceCandidatesMock.mockResolvedValue([
      { platformAddress: ADDRESS_A, derivationPath: "m/9'/1'/17'/0'/0'/0", index: 0, balanceCredits: 500_000_000n, nonce: 1 },
      { platformAddress: ADDRESS_B, derivationPath: "m/9'/1'/17'/0'/0'/1", index: 1, balanceCredits: 2_000_000_000n, nonce: 0 }
    ])

    handler = new EstimateWithdrawalFeeHandler(walletRepository, sdk)
  })

  describe('from an identity', () => {
    it('reports the fee on top of the amount and what the balance allows', async () => {
      const result = await handler.handle(event({ source: 'identity', amountCredits: '100000000' }))

      expect(sdk.identities.getIdentityBalance).toHaveBeenCalledWith(IDENTITY_ID)
      expect(result).toEqual({
        source: 'identity',
        identityId: IDENTITY_ID,
        fromAddress: null,
        feeCredits: IDENTITY_FEE.toString(),
        feeTakenFromAmount: false,
        balanceCredits: '1000000000',
        minAmountCredits: MIN_WITHDRAWAL_CREDITS.toString(),
        maxAmountCredits: (1_000_000_000n - IDENTITY_FEE).toString(),
        coreFeePerByte: 1,
        netAmountCredits: '100000000',
        totalCostCredits: (100_000_000n + IDENTITY_FEE).toString()
      })
    })

    it('describes the identity the payload names, not the current one', async () => {
      const result = await handler.handle(event({ source: 'identity', identityId: OTHER_IDENTITY }))

      expect(sdk.identities.getIdentityBalance).toHaveBeenCalledWith(OTHER_IDENTITY)
      expect(result.identityId).toBe(OTHER_IDENTITY)
    })

    it('leaves the amount-dependent fields out when no amount is given', async () => {
      const result = await handler.handle(event({ source: 'identity' }))

      expect(result.netAmountCredits).toBeNull()
      expect(result.totalCostCredits).toBeNull()
      expect(result.feeCredits).toBe(IDENTITY_FEE.toString())
    })

    it('reports nothing withdrawable when the balance cannot cover the fee', async () => {
      sdk.identities.getIdentityBalance.mockResolvedValue(1_000_000n)

      expect((await handler.handle(event({ source: 'identity' }))).maxAmountCredits).toBe('0')
    })

    it('throws when no identity is chosen and none is named', async () => {
      walletRepository.getCurrent.mockResolvedValue({ walletId: 'wallet1', network: 'testnet', currentIdentity: null })

      await expect(handler.handle(event({ source: 'identity' }))).rejects.toThrow('No identity is chosen to withdraw from')
    })
  })

  describe('from a platform address', () => {
    it('reports the fee as taken out of the amount, from the largest address', async () => {
      const result = await handler.handle(event({ source: 'address', amountCredits: '600000000' }))

      expect(result).toEqual({
        source: 'address',
        identityId: null,
        fromAddress: ADDRESS_B,
        feeCredits: ADDRESS_FEE.toString(),
        feeTakenFromAmount: true,
        balanceCredits: '2000000000',
        minAmountCredits: (ADDRESS_FEE + MIN_WITHDRAWAL_CREDITS).toString(),
        maxAmountCredits: (2_000_000_000n - ADDRESS_FEE).toString(),
        coreFeePerByte: 1,
        netAmountCredits: (600_000_000n - ADDRESS_FEE).toString(),
        totalCostCredits: '600000000'
      })
    })

    it('describes the address the payload names', async () => {
      const result = await handler.handle(event({ source: 'address', fromAddress: ADDRESS_A }))

      expect(result.fromAddress).toBe(ADDRESS_A)
      expect(result.maxAmountCredits).toBe((500_000_000n - ADDRESS_FEE).toString())
    })

    it('says nothing arrives when the amount is at or below the fee', async () => {
      const result = await handler.handle(event({ source: 'address', amountCredits: ADDRESS_FEE.toString() }))

      expect(result.netAmountCredits).toBe('0')
    })

    it('refuses an address the wallet does not own', async () => {
      await expect(handler.handle(event({ source: 'address', fromAddress: 'tdash1stranger' })))
        .rejects.toThrow('Source address not found in this wallet')
    })

    it('throws when no platform addresses exist yet', async () => {
      walletRepository.getPlatformAddressCount.mockResolvedValue(0)

      await expect(handler.handle(event({ source: 'address' }))).rejects.toThrow('No Platform addresses have been created yet')
    })

    it('throws when the platform xpub was never cached', async () => {
      walletRepository.getPlatformAccountXpub.mockResolvedValue(null)

      await expect(handler.handle(event({ source: 'address' }))).rejects.toThrow('Platform xpub is not initialized')
    })
  })

  it('reads only the source it was asked about', async () => {
    await handler.handle(event({ source: 'address', amountCredits: '600000000' }))

    expect(sdk.identities.getIdentityBalance).not.toHaveBeenCalled()

    jest.clearAllMocks()
    await handler.handle(event({ source: 'identity', amountCredits: '600000000' }))

    expect(buildPlatformSourceCandidatesMock).not.toHaveBeenCalled()
  })

  describe('validatePayload', () => {
    it('accepts both sources', () => {
      expect(handler.validatePayload({ source: 'identity' })).toBeNull()
      expect(handler.validatePayload({ source: 'address', amountCredits: '600000000' })).toBeNull()
    })

    it('rejects an unknown source and a bad amount', () => {
      expect(handler.validatePayload({ source: 'shielded' } as any)).toMatch(/source must be/)
      expect(handler.validatePayload({ source: 'identity', amountCredits: '1.5' })).toMatch(/integer string of credits/)
    })
  })
})
