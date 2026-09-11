import { GetCoreReceiveAddressHandler } from '../../../../src/content-script/api/private/core/getCoreReceiveAddress'
import { ListCoreAddressesHandler } from '../../../../src/content-script/api/private/core/listCoreAddresses'
import { GetCoreBalanceHandler } from '../../../../src/content-script/api/private/core/getCoreBalance'
import { CoreAddressChain } from '../../../../src/types/enums/CoreAddressChain'
import { WalletType } from '../../../../src/types/WalletType'
import { deriveCoreAccountXpub, deriveCoreAddressesFromXpub } from '../../../../src/utils/coreAddresses'

jest.mock('../../../../src/utils/coreAddresses', () => {
  const actual = jest.requireActual('../../../../src/utils/coreAddresses')
  return {
    ...actual,
    deriveCoreAccountXpub: jest.fn(),
    deriveCoreAddressesFromXpub: jest.fn()
  }
})

const deriveCoreAccountXpubMock = deriveCoreAccountXpub as jest.MockedFunction<typeof deriveCoreAccountXpub>
const deriveCoreAddressesFromXpubMock = deriveCoreAddressesFromXpub as jest.MockedFunction<typeof deriveCoreAddressesFromXpub>

const XPUB = 'tpubAccountXpub'

const entry = (index: number, chain: CoreAddressChain): any => ({
  address: `y${chain}${index}`,
  derivationPath: `m/44'/1'/0'/${chain === CoreAddressChain.receiving ? 0 : 1}/${index}`,
  index,
  chain
})

describe('core address handlers', () => {
  let walletRepository: any
  let sdk: any

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1',
        type: WalletType.seedphrase,
        network: 'testnet',
        label: null,
        encryptedMnemonic: 'encryptedMnemonic',
        seedHash: 'seedHash',
        currentIdentity: null
      })),
      getCoreAccountXpub: jest.fn(async () => XPUB),
      setCoreAccountXpub: jest.fn(async () => {})
    }

    sdk = {}

    deriveCoreAccountXpubMock.mockResolvedValue(XPUB)
    deriveCoreAddressesFromXpubMock.mockImplementation((_sdk, _xpub, _network, _account, chain, count, start = 0) =>
      Array.from({ length: count }, (_, offset) => entry(start + offset, chain))
    )
  })

  describe('GetCoreReceiveAddressHandler', () => {
    let coreExplorer: any
    let handler: GetCoreReceiveAddressHandler

    beforeEach(() => {
      coreExplorer = {
        getXpubSummary: jest.fn(async () => ({ nextUnused: { receiving: 3, change: 7 } }))
      }

      handler = new GetCoreReceiveAddressHandler(walletRepository, coreExplorer, sdk)
    })

    test('returns the first receiving address the explorer has not seen', async () => {
      const result = await handler.handle()

      expect(result.addresses).toEqual([entry(3, CoreAddressChain.receiving)])
      expect(deriveCoreAddressesFromXpubMock).toHaveBeenCalledWith(
        sdk, XPUB, 'testnet', 0, CoreAddressChain.receiving, 1, 3
      )
    })

    test('returns the same address again when nothing has been paid to it', async () => {
      const first = await handler.handle()
      const second = await handler.handle()

      expect(second).toEqual(first)
    })

    test('never writes anything: reading an address does not consume it', async () => {
      await handler.handle()

      expect(walletRepository.setCoreAccountXpub).not.toHaveBeenCalled()
    })

    test('moves on once the explorer sees the address used', async () => {
      coreExplorer.getXpubSummary.mockResolvedValueOnce({ nextUnused: { receiving: 4, change: 7 } })

      const result = await handler.handle()

      expect(result.addresses).toEqual([entry(4, CoreAddressChain.receiving)])
    })

    test('derives locally rather than trusting the explorer for the address', async () => {
      await handler.handle()

      // The explorer is asked only for the index; the address comes from our xpub.
      expect(deriveCoreAddressesFromXpubMock).toHaveBeenCalled()
    })

    test('throws when no wallet is chosen', async () => {
      walletRepository.getCurrent.mockResolvedValueOnce(null)

      await expect(handler.handle()).rejects.toThrow('No wallet is chosen')
    })

    test('throws when the xpub was never cached', async () => {
      walletRepository.getCoreAccountXpub.mockResolvedValueOnce(null)

      await expect(handler.handle()).rejects.toThrow('Core xpub is not initialized')
      expect(coreExplorer.getXpubSummary).not.toHaveBeenCalled()
    })

    test('validatePayload', () => {
      expect(handler.validatePayload({})).toBeNull()
      expect(handler.validatePayload({ account: 0 } as any)).toBe('Account is not supported')
      expect(handler.validatePayload({ chain: 'change' } as any))
        .toBe('Chain is not supported: change addresses are an internal concern of spending')
    })
  })

  describe('ListCoreAddressesHandler', () => {
    let coreExplorer: any
    let handler: ListCoreAddressesHandler

    beforeEach(() => {
      coreExplorer = {
        getXpubSummary: jest.fn(async () => ({ nextUnused: { receiving: 2, change: 1 } }))
      }

      handler = new ListCoreAddressesHandler(walletRepository, coreExplorer, sdk)
    })

    test('lists used addresses on both chains plus the next free one', async () => {
      const result = await handler.handle()

      expect(result.addresses).toEqual([
        entry(0, CoreAddressChain.receiving),
        entry(1, CoreAddressChain.receiving),
        entry(2, CoreAddressChain.receiving),
        entry(0, CoreAddressChain.change),
        entry(1, CoreAddressChain.change)
      ])
    })

    test('shows one address per chain on an untouched wallet', async () => {
      coreExplorer.getXpubSummary.mockResolvedValueOnce({ nextUnused: { receiving: 0, change: 0 } })

      const result = await handler.handle()

      expect(result.addresses).toEqual([
        entry(0, CoreAddressChain.receiving),
        entry(0, CoreAddressChain.change)
      ])
    })

    test('covers addresses used by another install on the same seed', async () => {
      // Nothing local says these exist; the extent comes from the explorer.
      coreExplorer.getXpubSummary.mockResolvedValueOnce({ nextUnused: { receiving: 5, change: 0 } })

      const result = await handler.handle()

      expect(result.addresses.filter(a => a.chain === CoreAddressChain.receiving)).toHaveLength(6)
    })

    test('returns an empty list when the xpub was never cached', async () => {
      walletRepository.getCoreAccountXpub.mockResolvedValueOnce(null)

      const result = await handler.handle()

      expect(result.addresses).toEqual([])
      expect(coreExplorer.getXpubSummary).not.toHaveBeenCalled()
    })

    test('never asks for a password', async () => {
      await handler.handle()

      expect(deriveCoreAccountXpubMock).not.toHaveBeenCalled()
    })

    test('throws when no wallet is chosen', async () => {
      walletRepository.getCurrent.mockResolvedValueOnce(null)

      await expect(handler.handle()).rejects.toThrow('No wallet is chosen')
    })

    test('validatePayload rejects an account', () => {
      expect(handler.validatePayload({})).toBeNull()
      expect(handler.validatePayload({ account: 0 } as any)).toBe('Account is not supported')
    })
  })

  describe('GetCoreBalanceHandler', () => {
    let coreExplorer: any
    let handler: GetCoreBalanceHandler

    const summary = {
      balance: 399337281n,
      received: 4827233218n,
      sent: 4427895937n,
      txCount: 21,
      addressCount: 51,
      usedAddressCount: 11,
      nextUnused: { receiving: 2, change: 9 }
    }

    beforeEach(() => {
      coreExplorer = { getXpubSummary: jest.fn(async () => summary) }
      handler = new GetCoreBalanceHandler(walletRepository, coreExplorer)
    })

    test('asks the explorer by xpub and returns amounts as strings', async () => {
      const result = await handler.handle()

      expect(coreExplorer.getXpubSummary).toHaveBeenCalledWith(XPUB, 'testnet')
      expect(result).toEqual({
        balance: '399337281',
        received: '4827233218',
        sent: '4427895937',
        txCount: 21,
        usedAddressCount: 11,
        nextUnused: { receiving: 2, change: 9 }
      })
    })

    test('never derives addresses locally', async () => {
      await handler.handle()

      expect(deriveCoreAddressesFromXpubMock).not.toHaveBeenCalled()
    })

    test('never asks for a password', async () => {
      await handler.handle()

      expect(deriveCoreAccountXpubMock).not.toHaveBeenCalled()
    })

    test('throws when no wallet is chosen', async () => {
      walletRepository.getCurrent.mockResolvedValueOnce(null)

      await expect(handler.handle()).rejects.toThrow('No wallet is chosen')
    })

    test('throws when the xpub was never cached', async () => {
      walletRepository.getCoreAccountXpub.mockResolvedValueOnce(null)

      await expect(handler.handle()).rejects.toThrow('Core xpub is not initialized')
      expect(coreExplorer.getXpubSummary).not.toHaveBeenCalled()
    })

    test('validatePayload rejects an account', () => {
      expect(handler.validatePayload({})).toBeNull()
      expect(handler.validatePayload({ account: 0 } as any)).toBe('Account is not supported')
    })
  })
})
