import { CoreExplorerService } from '../../../src/content-script/services/CoreExplorerService'
import { CORE_EXPLORER_URLS, CORE_UTXO_ADDRESS_BATCH } from '../../../src/constants'

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
  describe('getAddressesUtxos', () => {
    const okUtxos = (body: unknown): void => {
      fetchMock.mockResolvedValue({ status: 200, ok: true, json: async () => body })
    }

    it('asks for every address in one call and tags each utxo with its address', async () => {
      okUtxos([
        { prevTxHash: 'aa', vOutIndex: 0, address: 'yOne', amount: '1000' },
        { prevTxHash: 'bb', vOutIndex: 1, address: 'yTwo', amount: '2500' }
      ])

      const utxos = await service.getAddressesUtxos(['yOne', 'yTwo'], 'testnet')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(`${testnetBase}/addresses/utxo?addresses=yOne,yTwo`)
      expect(utxos).toEqual([
        { txid: 'aa', vout: 0, amount: 1000n, address: 'yOne' },
        { txid: 'bb', vout: 1, amount: 2500n, address: 'yTwo' }
      ])
    })

    it('chunks a long address list so the query string stays bounded', async () => {
      okUtxos([])

      const addresses = Array.from({ length: CORE_UTXO_ADDRESS_BATCH + 1 }, (_, index) => `yAddr${index}`)

      await service.getAddressesUtxos(addresses, 'testnet')

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenLastCalledWith(`${testnetBase}/addresses/utxo?addresses=yAddr${CORE_UTXO_ADDRESS_BATCH}`)
    })

    it('makes no request for an empty address list', async () => {
      expect(await service.getAddressesUtxos([], 'testnet')).toEqual([])
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('throws on a non-ok response', async () => {
      fetchMock.mockResolvedValue({ status: 503, ok: false, json: async () => ({}) })

      await expect(service.getAddressesUtxos(['yOne'], 'testnet')).rejects.toThrow('HTTP 503')
    })
  })
})
