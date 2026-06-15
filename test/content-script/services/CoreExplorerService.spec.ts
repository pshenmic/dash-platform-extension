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
})
