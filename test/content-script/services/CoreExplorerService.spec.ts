import { CoreExplorerService } from '../../../src/content-script/services/CoreExplorerService'
import { CORE_EXPLORER_URLS } from '../../../src/constants'

describe('CoreExplorerService', () => {
  const testnetBase = CORE_EXPLORER_URLS.testnet.api

  let service: CoreExplorerService
  let fetchMock: jest.Mock

  beforeEach(() => {
    service = new CoreExplorerService()
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  const mockResponse = (init: { status?: number, json?: unknown }): void => {
    const status = init.status ?? 200

    fetchMock.mockResolvedValue({
      status,
      ok: status >= 200 && status < 300,
      json: async () => init.json
    })
  }

  describe('getAddressInfo', () => {
    it('returns parsed info for a seen address', async () => {
      mockResponse({ json: { txCount: 3, balance: '1500', received: '2000', sent: '500' } })

      const info = await service.getAddressInfo('yTestAddr', 'testnet')

      expect(fetchMock).toHaveBeenCalledWith(`${testnetBase}/address/yTestAddr`)
      expect(info).toEqual({ txCount: 3, balance: 1500n, received: 2000n, sent: 500n })
    })

    it('returns null for a never-seen address (404)', async () => {
      mockResponse({ status: 404, json: { error: 'Address not found' } })

      expect(await service.getAddressInfo('yUnseen', 'testnet')).toBeNull()
    })

    it('throws on other non-OK responses', async () => {
      mockResponse({ status: 500, json: {} })

      await expect(service.getAddressInfo('yAddr', 'testnet')).rejects.toThrow('HTTP 500')
    })

    it('parses malformed numeric fields defensively without throwing', async () => {
      mockResponse({ json: { txCount: 'oops', balance: 'abc', received: null, sent: '42' } })

      const info = await service.getAddressInfo('yMalformed', 'testnet')

      expect(info).toEqual({ txCount: 0, balance: 0n, received: 0n, sent: 42n })
    })
  })

  describe('isAddressUsed', () => {
    it('is true when the address has at least one transaction', async () => {
      mockResponse({ json: { txCount: 1, balance: '0', received: '10', sent: '10' } })

      expect(await service.isAddressUsed('yUsed', 'testnet')).toBe(true)
    })

    it('is false for a never-seen address (404)', async () => {
      mockResponse({ status: 404, json: {} })

      expect(await service.isAddressUsed('yFree', 'testnet')).toBe(false)
    })

    it('is false when txCount is 0', async () => {
      mockResponse({ json: { txCount: 0, balance: '0', received: '0', sent: '0' } })

      expect(await service.isAddressUsed('yZero', 'testnet')).toBe(false)
    })
  })

  describe('getAddressUtxos', () => {
    it('maps the paginated result set into UTXOs', async () => {
      mockResponse({
        json: {
          resultSet: [
            { prevTxHash: 'aa', vOutIndex: 0, address: 'yAddr', amount: '1000' },
            { prevTxHash: 'bb', vOutIndex: 2, address: 'yAddr', amount: '2500' }
          ],
          pagination: { page: 1, limit: 10, total: 2 }
        }
      })

      const utxos = await service.getAddressUtxos('yAddr', 'testnet')

      expect(fetchMock).toHaveBeenCalledWith(`${testnetBase}/address/yAddr/utxo`)
      expect(utxos).toEqual([
        { txid: 'aa', vout: 0, amount: 1000n },
        { txid: 'bb', vout: 2, amount: 2500n }
      ])
    })

    it('returns an empty array for a never-seen address (404)', async () => {
      mockResponse({ status: 404, json: {} })

      expect(await service.getAddressUtxos('yUnseen', 'testnet')).toEqual([])
    })
  })

  it('targets the mainnet base url when network is mainnet', async () => {
    mockResponse({ json: { txCount: 0 } })

    await service.getAddressInfo('Xaddr', 'mainnet')

    expect(fetchMock).toHaveBeenCalledWith(`${CORE_EXPLORER_URLS.mainnet.api}/address/Xaddr`)
  })

  describe('getXpubSummary', () => {
    const XPUB = 'tpubTestAccountXpub'

    const okSummary = (body: unknown): void => {
      fetchMock.mockResolvedValue({ status: 200, ok: true, json: async () => body })
    }

    it('posts the xpub and parses the account totals', async () => {
      okSummary({
        balance: '399337281',
        received: '4827233218',
        sent: '4427895937',
        txCount: 21,
        addressCount: 51,
        usedAddressCount: 11,
        nextUnused: { receive: 2, change: 9 }
      })

      const summary = await service.getXpubSummary(XPUB, 'testnet')

      expect(fetchMock).toHaveBeenCalledWith(`${testnetBase}/xpub`, expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ xpub: XPUB })
      }))
      expect(summary).toEqual({
        balance: 399337281n,
        received: 4827233218n,
        sent: 4427895937n,
        txCount: 21,
        addressCount: 51,
        usedAddressCount: 11,
        nextUnused: { receiving: 2, change: 9 }
      })
    })

    it('renames the explorer receive chain to receiving, matching CoreAddressChain', async () => {
      okSummary({ balance: '0', nextUnused: { receive: 4, change: 7 } })

      const summary = await service.getXpubSummary(XPUB, 'testnet')

      expect(summary.nextUnused).toEqual({ receiving: 4, change: 7 })
    })

    it('degrades missing fields to zeros rather than throwing', async () => {
      okSummary({})

      const summary = await service.getXpubSummary(XPUB, 'testnet')

      expect(summary).toEqual({
        balance: 0n,
        received: 0n,
        sent: 0n,
        txCount: 0,
        addressCount: 0,
        usedAddressCount: 0,
        nextUnused: { receiving: 0, change: 0 }
      })
    })

    it('throws on a non-ok response', async () => {
      fetchMock.mockResolvedValue({ status: 500, ok: false, json: async () => ({}) })

      await expect(service.getXpubSummary(XPUB, 'testnet')).rejects.toThrow('HTTP 500')
    })
  })

  describe('getXpubAddresses', () => {
    const page = (addresses: string[], total: number): unknown => ({
      resultSet: addresses.map((address, index) => ({ address, branch: 0, index, used: false })),
      pagination: { page: 1, limit: 100, total }
    })

    it('walks every page the explorer reports and posts the xpub in the body', async () => {
      fetchMock
        .mockResolvedValueOnce({ status: 200, ok: true, json: async () => page(Array.from({ length: 100 }, (_, i) => `yA${i}`), 130) })
        .mockResolvedValueOnce({ status: 200, ok: true, json: async () => page(Array.from({ length: 30 }, (_, i) => `yB${i}`), 130) })

      const addresses = await service.getXpubAddresses('tpubXpub', 'testnet')

      expect(addresses).toHaveLength(130)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock.mock.calls[0][0]).toBe(`${testnetBase}/xpub/addresses`)
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ xpub: 'tpubXpub', page: 2, limit: 100 })
    })

    it('stops on an empty page even when the total says otherwise', async () => {
      mockResponse({ json: page([], 50) })

      expect(await service.getXpubAddresses('tpubXpub', 'testnet')).toEqual([])
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('throws on a non-OK response', async () => {
      mockResponse({ status: 400, json: {} })

      await expect(service.getXpubAddresses('tpubXpub', 'testnet')).rejects.toThrow('HTTP 400')
    })
  })

  describe('getXpubTransactions', () => {
    // Trimmed from the explorer's real reply for testnet transaction 96a08147…
    const confirmed = {
      hash: '96a0814779b2f98cf43a8972e49c2d645bfcd7d2c6a91372f3108c17da83ebaa',
      type: 'CLASSIC',
      blockHeight: 1553518,
      timestamp: '2026-09-14T09:42:38.000Z',
      amount: '99998396',
      vIn: [{ prevTxHash: 'e2'.repeat(32), vOutIndex: 0, address: 'yTSMr4iAQBQaafgQ6R6T1PmqZZttkmJdWY', amount: '99998622' }],
      vOut: [
        { value: 3000000, number: 0, address: 'yg9HuGtwizYXEGcqFUMUtmkLQCnzMqiXVa' },
        { value: 96998396, number: 1, address: 'ych5Yv7zmCs1XeZxcpXXpgpJsU36D5v923' }
      ],
      confirmations: 1856,
      instantLock: '0101',
      chainLocked: true
    }

    it('parses transactions, output values given as numbers', async () => {
      mockResponse({ json: { resultSet: [confirmed], pagination: { limit: 25, nextCursor: null } } })

      const result = await service.getXpubTransactions('tpubXpub', 'testnet', 25)

      expect(result).toEqual({
        transactions: [{
          hash: confirmed.hash,
          type: 'CLASSIC',
          blockHeight: 1553518,
          timestamp: '2026-09-14T09:42:38.000Z',
          confirmations: 1856,
          instantLocked: true,
          chainLocked: true,
          inputs: [{ address: 'yTSMr4iAQBQaafgQ6R6T1PmqZZttkmJdWY', amount: 99998622n }],
          outputs: [
            { address: 'yg9HuGtwizYXEGcqFUMUtmkLQCnzMqiXVa', amount: 3000000n },
            { address: 'ych5Yv7zmCs1XeZxcpXXpgpJsU36D5v923', amount: 96998396n }
          ]
        }],
        nextCursor: null
      })
    })

    it('reads a mempool transaction as unconfirmed and not yet locked', async () => {
      const pending = { ...confirmed, blockHeight: null, timestamp: null, confirmations: null, instantLock: null, chainLocked: false }
      mockResponse({ json: { resultSet: [pending], pagination: { limit: 25, nextCursor: null } } })

      const [transaction] = (await service.getXpubTransactions('tpubXpub', 'testnet', 25)).transactions

      expect(transaction).toMatchObject({ blockHeight: null, timestamp: null, confirmations: 0, instantLocked: false, chainLocked: false })
    })

    it('sends the cursor only when there is one, and returns the next one', async () => {
      const cursor = 'c'.repeat(64)
      mockResponse({ json: { resultSet: [], pagination: { limit: 10, nextCursor: cursor } } })

      const first = await service.getXpubTransactions('tpubXpub', 'testnet', 10)
      await service.getXpubTransactions('tpubXpub', 'testnet', 10, cursor)

      expect(first.nextCursor).toBe(cursor)
      expect(fetchMock.mock.calls[0][0]).toBe(`${testnetBase}/xpub/transactions`)
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ xpub: 'tpubXpub', limit: 10 })
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ xpub: 'tpubXpub', limit: 10, cursor })
    })

    it('throws on a non-OK response, such as an unknown cursor', async () => {
      mockResponse({ status: 400, json: { error: 'Unknown cursor transaction' } })

      await expect(service.getXpubTransactions('tpubXpub', 'testnet', 25, 'd'.repeat(64))).rejects.toThrow('HTTP 400')
    })
  })
})
