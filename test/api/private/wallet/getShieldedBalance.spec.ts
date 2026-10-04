import { GetShieldedBalanceHandler } from '../../../../src/content-script/api/private/wallet/getShieldedBalance'
import { ShieldedService } from '../../../../src/content-script/services/ShieldedService'

// The pool read and the seed derivation are stubbed on a real service, so this
// exercises the handler wiring plus the actual per-address grouping.

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
  let shielded: ShieldedService
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

    shielded = new ShieldedService({} as any, sdk)
    jest.spyOn(shielded, 'deriveSeed').mockReturnValue(new Uint8Array([1, 2, 3]))
    jest.spyOn(shielded, 'fetchAllNotes').mockResolvedValue([
      { nullifier: Uint8Array.from([1]) },
      { nullifier: Uint8Array.from([2]) },
      { nullifier: Uint8Array.from([3]) }
    ] as any)
    jest.spyOn(shielded, 'deriveAddresses').mockReturnValue([
      { address: ADDR_0, derivationPath: "m/32'/1'/0'", diversifierIndex: 0 }
    ])

    handler = new GetShieldedBalanceHandler(walletRepository, shielded)
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
  it('reads the balance of a wallet holding more notes than one nullifier query allows', async () => {
    // 110 own notes: the case that failed in production with
    // "trying to check 110 nullifiers, maximum is 100".
    const notes = Array.from({ length: 110 }, (_, i) => recoveredNote(i, 1n, ADDR_0))
    sdk.shielded.recoverNotes.mockReturnValue(notes)
    sdk.shielded.getShieldedNullifiers.mockImplementation(async (chunk: Uint8Array[]) => {
      if (chunk.length > 100) {
        throw new Error(`trying to check ${chunk.length} nullifiers, maximum is 100`)
      }

      return []
    })

    const result = await handle()

    expect(result.balance).toBe('110')
    expect(sdk.shielded.getShieldedNullifiers).toHaveBeenCalledTimes(2)
  })
})
