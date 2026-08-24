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

  describe('getAddressesInfo', () => {
    const okBatch = (rows: unknown): void => {
      fetchMock.mockResolvedValue({ status: 200, ok: true, json: async () => rows })
    }

    it('asks for every address in one comma separated request', async () => {
      okBatch([
        { address: 'yA', balance: '10', txCount: 1 },
        { address: 'yB', balance: '20', txCount: 2 }
      ])

      const infos = await service.getAddressesInfo(['yA', 'yB'], 'testnet')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(`${testnetBase}/addresses/info?addresses=yA,yB`)
      expect(infos).toEqual([
        { address: 'yA', balance: 10n, txCount: 1 },
        { address: 'yB', balance: 20n, txCount: 2 }
      ])
    })

    it('keeps the caller order even when the explorer reorders the rows', async () => {
      okBatch([
        { address: 'yB', balance: '20', txCount: 2 },
        { address: 'yA', balance: '10', txCount: 1 }
      ])

      const infos = await service.getAddressesInfo(['yA', 'yB'], 'testnet')

      expect(infos.map(info => info.address)).toEqual(['yA', 'yB'])
      expect(infos[0].balance).toEqual(10n)
    })

    it('fills addresses the explorer omits in as zeros', async () => {
      okBatch([{ address: 'ySeen', balance: '5', txCount: 1 }])

      const infos = await service.getAddressesInfo(['ySeen', 'yUnseen'], 'testnet')

      expect(infos).toEqual([
        { address: 'ySeen', balance: 5n, txCount: 1 },
        { address: 'yUnseen', balance: 0n, txCount: 0 }
      ])
    })

    it('splits a list longer than the explorer limit into chunks', async () => {
      const addresses = Array.from({ length: 150 }, (_, i) => `yAddr${i}`)
      okBatch([])

      await service.getAddressesInfo(addresses, 'testnet')

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock.mock.calls[0][0]).toContain('yAddr0,')
      expect(fetchMock.mock.calls[1][0]).toContain('yAddr100,')
    })

    it('makes no request for an empty list', async () => {
      expect(await service.getAddressesInfo([], 'testnet')).toEqual([])
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('throws on a non-ok response', async () => {
      fetchMock.mockResolvedValue({ status: 500, ok: false, json: async () => ({}) })

      await expect(service.getAddressesInfo(['yA'], 'testnet')).rejects.toThrow('HTTP 500')
    })
  })
})
