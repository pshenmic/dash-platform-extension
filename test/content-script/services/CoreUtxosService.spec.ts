import { CoreUtxosService } from '../../../src/content-script/services/CoreUtxosService'
import { CoreAddressChain } from '../../../src/types/enums/CoreAddressChain'
import { deriveCoreAddressesFromXpub } from '../../../src/utils/coreAddresses'

jest.mock('../../../src/utils/coreAddresses', () => {
  const actual = jest.requireActual('../../../src/utils/coreAddresses')
  return {
    ...actual,
    deriveCoreAddressesFromXpub: jest.fn()
  }
})

const deriveCoreAddressesFromXpubMock = deriveCoreAddressesFromXpub as jest.MockedFunction<typeof deriveCoreAddressesFromXpub>

const XPUB = 'tpubAccountXpub'
const RECEIVING = ['yRecv0', 'yRecv1']
const CHANGE = ['yChange0', 'yChange1']

const utxo = (address: string, amount: bigint, vout = 0, txid = 'a'.repeat(64)): any => ({
  txid, vout, amount, address
})

describe('CoreUtxosService', () => {
  const wallet: any = { walletId: 'wallet1', type: 'seedphrase', network: 'testnet' }

  let coreExplorer: any
  let service: CoreUtxosService

  beforeEach(() => {
    jest.clearAllMocks()

    coreExplorer = {
      getXpubSummary: jest.fn(async () => ({ nextUnused: { receiving: 1, change: 1 } })),
      getAddressesUtxos: jest.fn(async () => [utxo(RECEIVING[0], 100_000n)])
    }

    // The wallet owns index 0 and 1 on both chains: the explorer's next unused
    // index is 1 and the derived list includes that free one.
    deriveCoreAddressesFromXpubMock.mockImplementation((_sdk, _xpub, _network, _account, chain, count, start = 0) => {
      const isReceiving = chain === CoreAddressChain.receiving
      const pool = isReceiving ? RECEIVING : CHANGE

      return Array.from({ length: count }, (_, offset) => ({
        address: pool[start + offset],
        derivationPath: `m/44'/1'/0'/${isReceiving ? 0 : 1}/${start + offset}`,
        index: start + offset,
        chain
      }))
    })

    service = new CoreUtxosService({} as any, coreExplorer)
  })

  it('reads every address of the account the explorer has seen, plus the free one', async () => {
    const { owned, nextUnused } = await service.spendable(wallet, XPUB)

    expect(coreExplorer.getAddressesUtxos).toHaveBeenCalledWith([...RECEIVING, ...CHANGE], 'testnet')
    expect([...owned.keys()]).toEqual([...RECEIVING, ...CHANGE])
    expect(nextUnused).toEqual({ receiving: 1, change: 1 })
  })

  it('narrows the read to the addresses asked for', async () => {
    await service.spendable(wallet, XPUB, 0, [RECEIVING[0]])

    expect(coreExplorer.getAddressesUtxos).toHaveBeenCalledWith([RECEIVING[0]], 'testnet')
  })

  it('refuses an address the account does not derive, without reading the explorer', async () => {
    await expect(service.spendable(wallet, XPUB, 0, ['yNotOurs']))
      .rejects.toThrow('Source address not found in this wallet')
    expect(coreExplorer.getAddressesUtxos).not.toHaveBeenCalled()
  })

  it('drops an output the explorer could not attribute to one of those addresses', async () => {
    coreExplorer.getAddressesUtxos.mockResolvedValue([utxo(RECEIVING[0], 100_000n), utxo('yStranger', 7_000n, 1)])

    const { utxos } = await service.spendable(wallet, XPUB)

    expect(utxos.map(entry => entry.address)).toEqual([RECEIVING[0]])
  })
})
