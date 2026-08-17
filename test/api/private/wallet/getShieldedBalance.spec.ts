import { GetShieldedBalanceHandler } from '../../../../src/content-script/api/private/wallet/getShieldedBalance'
import { decryptMnemonic, deriveShieldedAddresses, fetchAllShieldedNotes } from '../../../../src/utils'

// Mock the network / derivation primitives but keep sumUnspentShieldedValue real,
// so this exercises the handler wiring plus the actual per-address grouping.
jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    decryptMnemonic: jest.fn(),
    fetchAllShieldedNotes: jest.fn(),
    deriveShieldedAddresses: jest.fn()
  }
})

const decryptMnemonicMock = decryptMnemonic as jest.MockedFunction<typeof decryptMnemonic>
const fetchAllShieldedNotesMock = fetchAllShieldedNotes as jest.MockedFunction<typeof fetchAllShieldedNotes>
const deriveShieldedAddressesMock = deriveShieldedAddresses as jest.MockedFunction<typeof deriveShieldedAddresses>

const ADDR_0 = 'orchardAddress0'
const ADDR_OUT = 'orchardAddressOutOfWindow'

const recoveredNote = (index: number, value: bigint, address: string): any => ({
  index,
  note: { value, address: { toBech32m: () => address } },
  // Own nullifier (derived from the viewing key) — what the spent check reads.
  _rawRecoveredNote: { nullifier: Uint8Array.from([index]) }
})

describe('GetShieldedBalanceHandler', () => {
  let walletRepository: any
  let sdk: any
  let handler: GetShieldedBalanceHandler

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
      keyPair: {
        mnemonicToSeed: jest.fn(() => new Uint8Array([1, 2, 3]))
      },
      shielded: {
        recoverNotes: jest.fn(() => [
          recoveredNote(0, 100n, ADDR_0),
          recoveredNote(1, 40n, ADDR_0),
          recoveredNote(2, 25n, ADDR_OUT)
        ]),
        getShieldedNullifiers: jest.fn(async () => [])
      }
    }

    decryptMnemonicMock.mockReturnValue('mnemonic words')
    fetchAllShieldedNotesMock.mockResolvedValue([
      { nullifier: Uint8Array.from([1]) },
      { nullifier: Uint8Array.from([2]) },
      { nullifier: Uint8Array.from([3]) }
    ] as any)
    deriveShieldedAddressesMock.mockReturnValue([
      { address: ADDR_0, derivationPath: "m/32'/1'/0'", diversifierIndex: 0 }
    ])

    handler = new GetShieldedBalanceHandler(walletRepository, sdk)
  })

  const handle = async (): Promise<any> => {
    return await handler.handle({
      context: 'dash-platform-extension',
      id: 'id',
      method: 'GET_SHIELDED_BALANCE',
      type: 'request',
      payload: { password: 'test' }
    })
  }

  it('returns the aggregate balance plus a per-address breakdown', async () => {
    const result = await handle()

    expect(result.balance).toBe('165')
    expect(result.spendableNotes).toBe(3)
    expect(result.totalNotes).toBe(3)

    const byAddr = Object.fromEntries(result.byAddress.map((entry: any) => [entry.address, entry]))
    expect(byAddr[ADDR_0]).toEqual({ address: ADDR_0, diversifierIndex: 0, balance: '140', spendableNotes: 2 })
    expect(byAddr[ADDR_OUT]).toEqual({ address: ADDR_OUT, diversifierIndex: null, balance: '25', spendableNotes: 1 })
  })

  it('throws when no wallet is chosen', async () => {
    walletRepository.getCurrent.mockResolvedValueOnce(null)

    await expect(handle()).rejects.toThrow('No wallet is chosen')
  })
})
