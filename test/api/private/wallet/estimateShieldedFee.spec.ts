import { EstimateShieldedFeeHandler } from '../../../../src/content-script/api/private/wallet/estimateShieldedFee'
import { decryptMnemonic, loadUnspentShieldedNotes } from '../../../../src/utils'

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    decryptMnemonic: jest.fn(),
    loadUnspentShieldedNotes: jest.fn()
  }
})

const decryptMnemonicMock = decryptMnemonic as jest.MockedFunction<typeof decryptMnemonic>
const loadUnspentShieldedNotesMock = loadUnspentShieldedNotes as jest.MockedFunction<typeof loadUnspentShieldedNotes>

const M = 1_000_000n
const TRANSFER_FEE_2 = 162_851_200n
const SOURCE_ADDRESS = 'orchardSource0'

const note = (value: bigint): any => ({ note: { value } })

describe('EstimateShieldedFeeHandler', () => {
  let walletRepository: any
  let sdk: any
  let handler: EstimateShieldedFeeHandler

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

    sdk = { keyPair: { mnemonicToSeed: jest.fn(() => new Uint8Array([1, 2, 3])) } }

    decryptMnemonicMock.mockReturnValue('mnemonic words')
    loadUnspentShieldedNotesMock.mockResolvedValue({ allNotes: [], unspent: [note(500n * M), note(300n * M)] })

    handler = new EstimateShieldedFeeHandler(walletRepository, sdk)
  })

  const handle = async (payload: any): Promise<any> => {
    return await handler.handle({
      context: 'dash-platform-extension',
      id: 'id',
      method: 'ESTIMATE_SHIELDED_FEE',
      type: 'request',
      payload
    })
  }

  it('estimates the fee and notes for the requested amount', async () => {
    const result = await handle({ kind: 'transfer', password: 'test', amountCredits: (100n * M).toString() })

    expect(result).toEqual({
      feeCredits: TRANSFER_FEE_2.toString(),
      notesCount: 1,
      maxAmountCredits: (800n * M - TRANSFER_FEE_2).toString()
    })
    expect(loadUnspentShieldedNotesMock).toHaveBeenCalledWith(sdk, expect.any(Uint8Array), 'testnet', 0, undefined)
  })

  it('describes the largest spend when no amount is given', async () => {
    const result = await handle({ kind: 'transfer', password: 'test' })

    expect(result).toEqual({
      feeCredits: TRANSFER_FEE_2.toString(),
      notesCount: 2,
      maxAmountCredits: (800n * M - TRANSFER_FEE_2).toString()
    })
  })

  it('prices the spend kind it is asked about', async () => {
    const transfer = await handle({ kind: 'transfer', password: 'test', amountCredits: (100n * M).toString() })
    const withdrawal = await handle({ kind: 'withdrawal', password: 'test', amountCredits: (100n * M).toString() })

    expect(BigInt(withdrawal.feeCredits) - BigInt(transfer.feeCredits)).toBe(112_340_000n)
  })

  it('loads notes only from the requested source addresses', async () => {
    await handle({ kind: 'transfer', password: 'test', amountCredits: '1000', account: 1, fromAddresses: [SOURCE_ADDRESS] })

    expect(loadUnspentShieldedNotesMock).toHaveBeenCalledWith(sdk, expect.any(Uint8Array), 'testnet', 1, [SOURCE_ADDRESS])
  })

  it('rejects an amount the notes cannot cover with its fee', async () => {
    await expect(handle({ kind: 'transfer', password: 'test', amountCredits: (700n * M).toString() }))
      .rejects.toThrow(/Insufficient shielded balance/)
  })

  it('rejects a keystore wallet', async () => {
    walletRepository.getCurrent.mockResolvedValueOnce({ walletId: 'wallet1', type: 'keystore', network: 'testnet' })

    await expect(handle({ kind: 'transfer', password: 'test' })).rejects.toThrow(/seedphrase wallet/)
    expect(loadUnspentShieldedNotesMock).not.toHaveBeenCalled()
  })

  describe('validatePayload', () => {
    const base = { kind: 'transfer', password: 'test' } as any

    it('accepts a payload without an amount', () => {
      expect(handler.validatePayload(base)).toBeNull()
    })

    it('rejects an unknown kind', () => {
      expect(handler.validatePayload({ ...base, kind: 'shield' })).toBe('kind must be one of transfer, unshield, withdrawal')
    })

    it('rejects a missing password', () => {
      expect(handler.validatePayload({ ...base, password: '' })).toBe('Password must be provided')
    })

    it('rejects a non-positive amount', () => {
      expect(handler.validatePayload({ ...base, amountCredits: '0' })).toBe('Amount must be a positive integer string of credits')
    })

    it('rejects source addresses for anything but a transfer', () => {
      expect(handler.validatePayload({ ...base, kind: 'unshield', fromAddresses: [SOURCE_ADDRESS] })).toBe('fromAddresses is only supported for a transfer')
    })

    it('rejects an empty fromAddresses array', () => {
      expect(handler.validatePayload({ ...base, fromAddresses: [] })).toBe('fromAddresses must be a non-empty array of addresses')
    })
  })
})
