import { ListCoreUtxosHandler } from '../../../../src/content-script/api/private/core/listCoreUtxos'

const XPUB = 'tpubAccountXpub'

const utxo = (address: string, amount: bigint, vout: number, timestamp: number | undefined, blockHeight?: number): any => ({
  txid: 'a'.repeat(64),
  vout,
  amount,
  address,
  blockHeight,
  confirmations: blockHeight != null ? 3 : undefined,
  timestamp
})

describe('ListCoreUtxosHandler', () => {
  let walletRepository: any
  let coreUtxos: any
  let handler: ListCoreUtxosHandler

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({ walletId: 'wallet1', type: 'seedphrase', network: 'testnet' })),
      getCoreAccountXpub: jest.fn(async () => XPUB)
    }

    coreUtxos = {
      spendable: jest.fn(async () => ({
        utxos: [utxo('yRecv0', 100_000n, 0, 1_700_000_000, 900_100)],
        owned: new Map(),
        nextUnused: { receiving: 1, change: 1 }
      }))
    }

    handler = new ListCoreUtxosHandler(walletRepository, coreUtxos)
  })

  it('lists the spendable outputs with amounts as strings', async () => {
    const result = await handler.handle()

    expect(coreUtxos.spendable).toHaveBeenCalledWith(expect.objectContaining({ walletId: 'wallet1' }), XPUB)
    expect(result).toEqual({
      utxos: [{
        txid: 'a'.repeat(64),
        vout: 0,
        address: 'yRecv0',
        amount: '100000',
        blockHeight: 900_100,
        confirmations: 3,
        timestamp: 1_700_000_000
      }]
    })
  })

  it('puts the newest output first, and an unconfirmed one ahead of them all', async () => {
    coreUtxos.spendable.mockResolvedValue({
      utxos: [
        utxo('yRecv0', 1n, 0, 1_700_000_000, 900_100),
        utxo('yRecv1', 2n, 1, 1_700_000_900, 900_200),
        utxo('yChange0', 3n, 2, undefined)
      ],
      owned: new Map(),
      nextUnused: { receiving: 1, change: 1 }
    })

    const result = await handler.handle()

    expect(result.utxos.map(entry => entry.vout)).toEqual([2, 1, 0])
    expect(result.utxos[0]).toEqual(expect.objectContaining({
      blockHeight: null, confirmations: null, timestamp: null
    }))
  })

  it('returns an empty list when the Core xpub has never been initialized', async () => {
    walletRepository.getCoreAccountXpub.mockResolvedValue(null)

    expect(await handler.handle()).toEqual({ utxos: [] })
    expect(coreUtxos.spendable).not.toHaveBeenCalled()
  })

  it('throws when no wallet is chosen', async () => {
    walletRepository.getCurrent.mockResolvedValue(null)

    await expect(handler.handle()).rejects.toThrow('No wallet is chosen')
  })

  it('validatePayload rejects an account', () => {
    expect(handler.validatePayload({})).toBeNull()
    expect(handler.validatePayload({ account: 0 } as any)).toBe('Account is not supported')
  })
})
