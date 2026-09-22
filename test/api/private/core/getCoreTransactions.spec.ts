import { GetCoreTransactionsHandler } from '../../../../src/content-script/api/private/core/getCoreTransactions'
import { WalletType } from '../../../../src/types/WalletType'

const XPUB = 'tpubAccountXpub'
const CURSOR = 'b'.repeat(64)

describe('GetCoreTransactionsHandler', () => {
  let walletRepository: any
  let coreExplorer: any
  let handler: GetCoreTransactionsHandler

  const handle = async (payload: any = {}): Promise<any> => {
    return await handler.handle({ context: 'dash-platform-extension', id: 'id', method: 'GET_CORE_TRANSACTIONS', type: 'request', payload } as any)
  }

  beforeEach(() => {
    walletRepository = {
      getCurrent: jest.fn(async () => ({ walletId: 'wallet1', type: WalletType.seedphrase, network: 'testnet' })),
      getCoreAccountXpub: jest.fn(async () => XPUB)
    }

    coreExplorer = {
      getXpubAddresses: jest.fn(async () => ['yOwnReceive0', 'yOwnChange0']),
      getXpubTransactions: jest.fn(async () => ({
        transactions: [{
          hash: 'a'.repeat(64),
          type: 'CLASSIC',
          blockHeight: null,
          timestamp: null,
          confirmations: 0,
          instantLocked: true,
          chainLocked: false,
          inputs: [{ address: 'yOwnReceive0', amount: 99_998_622n }],
          outputs: [{ address: 'yRecipient', amount: 3_000_000n }, { address: 'yOwnChange0', amount: 96_998_396n }]
        }],
        nextCursor: CURSOR
      }))
    }

    handler = new GetCoreTransactionsHandler(walletRepository, coreExplorer)
  })

  it('summarizes each transaction against the account addresses the explorer resolved', async () => {
    const result = await handle()

    expect(result).toEqual({
      transactions: [{
        hash: 'a'.repeat(64),
        type: 'CLASSIC',
        blockHeight: null,
        timestamp: null,
        confirmations: 0,
        instantLocked: true,
        chainLocked: false,
        direction: 'sent',
        amountDuffs: '-3000226',
        receivedDuffs: '96998396',
        sentDuffs: '99998622',
        feeDuffs: '226',
        counterparties: ['yRecipient']
      }],
      nextCursor: CURSOR
    })
    expect(coreExplorer.getXpubAddresses).toHaveBeenCalledWith(XPUB, 'testnet')
  })

  it('asks for the default page size when none is given', async () => {
    await handle()

    expect(coreExplorer.getXpubTransactions).toHaveBeenCalledWith(XPUB, 'testnet', 25, undefined)
  })

  it('passes the page size and cursor through', async () => {
    await handle({ limit: 10, cursor: CURSOR })

    expect(coreExplorer.getXpubTransactions).toHaveBeenCalledWith(XPUB, 'testnet', 10, CURSOR)
  })

  it('asks for the xpub to be initialized when it is missing', async () => {
    walletRepository.getCoreAccountXpub.mockResolvedValueOnce(null)

    await expect(handle()).rejects.toThrow('Core xpub is not initialized')
    expect(coreExplorer.getXpubTransactions).not.toHaveBeenCalled()
  })

  it('rejects when no wallet is chosen', async () => {
    walletRepository.getCurrent.mockResolvedValueOnce(null)

    await expect(handle()).rejects.toThrow('No wallet is chosen')
  })

  describe('validatePayload', () => {
    it('accepts an empty payload', () => {
      expect(handler.validatePayload({})).toBeNull()
    })

    it('accepts a page size and a cursor', () => {
      expect(handler.validatePayload({ limit: 100, cursor: CURSOR })).toBeNull()
    })

    it('rejects a page size outside 1..100', () => {
      expect(handler.validatePayload({ limit: 0 })).toBe('limit must be an integer between 1 and 100')
      expect(handler.validatePayload({ limit: 101 })).toBe('limit must be an integer between 1 and 100')
      expect(handler.validatePayload({ limit: 2.5 })).toBe('limit must be an integer between 1 and 100')
    })

    it('rejects a cursor that is not a transaction hash', () => {
      expect(handler.validatePayload({ cursor: 'next' })).toBe('cursor must be the nextCursor of a previous page')
    })
  })
})
