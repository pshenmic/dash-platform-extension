import { GenerateCoreAddressesHandler } from '../../../../src/content-script/api/private/wallet/generateCoreAddresses'
import { ListCoreAddressesHandler } from '../../../../src/content-script/api/private/wallet/listCoreAddresses'
import { GetCoreAddressesInfosHandler } from '../../../../src/content-script/api/private/wallet/getCoreAddressesInfos'
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
const PASSWORD = 'test'

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
      setCoreAccountXpub: jest.fn(async () => {}),
      getCoreAddressCount: jest.fn(async () => 0),
      setCoreAddressCount: jest.fn(async () => {})
    }

    sdk = {}

    deriveCoreAccountXpubMock.mockResolvedValue(XPUB)
    deriveCoreAddressesFromXpubMock.mockImplementation((_sdk, _xpub, _network, _account, chain, count, start = 0) =>
      Array.from({ length: count }, (_, offset) => entry(start + offset, chain))
    )
  })

  describe('GenerateCoreAddressesHandler', () => {
    let handler: GenerateCoreAddressesHandler

    beforeEach(() => {
      handler = new GenerateCoreAddressesHandler(walletRepository, sdk)
    })

    const handle = async (payload: any = {}): Promise<any> =>
      await handler.handle({ context: 'dash-platform-extension', id: 'id', method: 'GENERATE_CORE_ADDRESSES', type: 'request', payload } as any)

    test('returns the next receiving address and advances that chain', async () => {
      walletRepository.getCoreAddressCount.mockResolvedValueOnce(3)

      const result = await handle()

      expect(result.addresses).toEqual([entry(3, CoreAddressChain.receiving)])
      expect(walletRepository.getCoreAddressCount).toHaveBeenCalledWith(0, CoreAddressChain.receiving)
      expect(walletRepository.setCoreAddressCount).toHaveBeenCalledWith(0, CoreAddressChain.receiving, 4)
      expect(deriveCoreAddressesFromXpubMock).toHaveBeenCalledWith(sdk, XPUB, 'testnet', 0, CoreAddressChain.receiving, 1, 3)
    })

    test('advances the change chain independently when asked', async () => {
      walletRepository.getCoreAddressCount.mockResolvedValueOnce(1)

      const result = await handle({ chain: CoreAddressChain.change })

      expect(result.addresses).toEqual([entry(1, CoreAddressChain.change)])
      expect(walletRepository.setCoreAddressCount).toHaveBeenCalledWith(0, CoreAddressChain.change, 2)
    })

    test('initializes the xpub from the password when it is missing', async () => {
      walletRepository.getCoreAccountXpub.mockResolvedValueOnce(null)

      await handle({ password: PASSWORD })

      expect(deriveCoreAccountXpubMock).toHaveBeenCalledWith(expect.objectContaining({ walletId: 'wallet1' }), PASSWORD, 0, sdk)
      expect(walletRepository.setCoreAccountXpub).toHaveBeenCalledWith(0, XPUB)
    })

    test('does not touch the password when the xpub is already cached', async () => {
      await handle({ password: PASSWORD })

      expect(deriveCoreAccountXpubMock).not.toHaveBeenCalled()
      expect(walletRepository.setCoreAccountXpub).not.toHaveBeenCalled()
    })

    test('demands a password when the xpub is missing', async () => {
      walletRepository.getCoreAccountXpub.mockResolvedValueOnce(null)

      await expect(handle()).rejects.toThrow('Core xpub is not initialized')
      expect(walletRepository.setCoreAddressCount).not.toHaveBeenCalled()
    })

    test('throws when no wallet is chosen', async () => {
      walletRepository.getCurrent.mockResolvedValueOnce(null)

      await expect(handle()).rejects.toThrow('No wallet is chosen')
    })

    test('throws for a non-seedphrase wallet', async () => {
      walletRepository.getCurrent.mockResolvedValueOnce({ walletId: 'wallet1', type: WalletType.keystore, network: 'testnet' })

      await expect(handle()).rejects.toThrow('Core addresses can only be generated for a seedphrase wallet')
    })

    test('validatePayload', () => {
      expect(handler.validatePayload({})).toBeNull()
      expect(handler.validatePayload({ chain: CoreAddressChain.change })).toBeNull()
      expect(handler.validatePayload({ password: '' } as any)).toBe('Password must be a non-empty string when provided')
      expect(handler.validatePayload({ chain: 'internal' } as any)).toBe('Unknown chain internal')
      expect(handler.validatePayload({ account: 1 } as any)).toBe('Account is not supported')
      expect(handler.validatePayload({ count: 2 } as any)).toBe('Count is not supported')
    })
  })

  describe('ListCoreAddressesHandler', () => {
    let handler: ListCoreAddressesHandler

    beforeEach(() => {
      handler = new ListCoreAddressesHandler(walletRepository, sdk)
    })

    test('returns both chains, receiving first, in index order', async () => {
      walletRepository.getCoreAddressCount.mockImplementation(async (_account: number, chain: CoreAddressChain) =>
        chain === CoreAddressChain.receiving ? 2 : 1
      )

      const result = await handler.handle()

      expect(result.addresses).toEqual([
        entry(0, CoreAddressChain.receiving),
        entry(1, CoreAddressChain.receiving),
        entry(0, CoreAddressChain.change)
      ])
    })

    test('skips a chain with no addresses created', async () => {
      walletRepository.getCoreAddressCount.mockImplementation(async (_account: number, chain: CoreAddressChain) =>
        chain === CoreAddressChain.receiving ? 1 : 0
      )

      const result = await handler.handle()

      expect(result.addresses).toEqual([entry(0, CoreAddressChain.receiving)])
      expect(deriveCoreAddressesFromXpubMock).toHaveBeenCalledTimes(1)
    })

    test('returns an empty list before any address is created', async () => {
      const result = await handler.handle()

      expect(result.addresses).toEqual([])
      expect(deriveCoreAddressesFromXpubMock).not.toHaveBeenCalled()
    })

    test('returns an empty list when the xpub was never cached', async () => {
      walletRepository.getCoreAccountXpub.mockResolvedValueOnce(null)
      walletRepository.getCoreAddressCount.mockResolvedValue(5)

      const result = await handler.handle()

      expect(result.addresses).toEqual([])
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

  describe('GetCoreAddressesInfosHandler', () => {
    let coreExplorer: any
    let handler: GetCoreAddressesInfosHandler

    beforeEach(() => {
      coreExplorer = {
        getAddressInfo: jest.fn(async (address: string) => ({
          txCount: 2,
          balance: 1000n,
          received: 3000n,
          sent: 2000n,
          address
        }))
      }

      handler = new GetCoreAddressesInfosHandler(walletRepository, coreExplorer)
    })

    const handle = async (addresses: string[]): Promise<any> =>
      await handler.handle({ context: 'dash-platform-extension', id: 'id', method: 'GET_CORE_ADDRESSES_INFOS', type: 'request', payload: { addresses } } as any)

    test('returns amounts as strings on the wallet network', async () => {
      const result = await handle(['yAddr1'])

      expect(result.infos).toEqual([{ address: 'yAddr1', balance: '1000', received: '3000', sent: '2000', txCount: 2 }])
      expect(coreExplorer.getAddressInfo).toHaveBeenCalledWith('yAddr1', 'testnet')
    })

    test('keeps each balance paired with its own address', async () => {
      coreExplorer.getAddressInfo.mockImplementation(async (address: string) => ({
        txCount: 1,
        balance: BigInt(address.length),
        received: BigInt(address.length),
        sent: 0n
      }))

      const result = await handle(['yShort', 'yMuchLongerAddress'])

      expect(result.infos).toEqual([
        { address: 'yShort', balance: '6', received: '6', sent: '0', txCount: 1 },
        { address: 'yMuchLongerAddress', balance: '18', received: '18', sent: '0', txCount: 1 }
      ])
    })

    test('reports zeros for an address never seen on-chain', async () => {
      coreExplorer.getAddressInfo.mockResolvedValueOnce(null)

      const result = await handle(['yUnseen'])

      expect(result.infos).toEqual([{ address: 'yUnseen', balance: '0', received: '0', sent: '0', txCount: 0 }])
    })

    test('short-circuits an empty request without touching the explorer', async () => {
      const result = await handle([])

      expect(result.infos).toEqual([])
      expect(walletRepository.getCurrent).not.toHaveBeenCalled()
      expect(coreExplorer.getAddressInfo).not.toHaveBeenCalled()
    })

    test('throws when no wallet is chosen', async () => {
      walletRepository.getCurrent.mockResolvedValueOnce(null)

      await expect(handle(['yAddr1'])).rejects.toThrow('No wallet is chosen')
    })

    test('validatePayload', () => {
      expect(handler.validatePayload({ addresses: ['yAddr1'] })).toBeNull()
      expect(handler.validatePayload({ addresses: 'yAddr1' } as any)).toBe('Addresses must be an array')
      expect(handler.validatePayload({ addresses: [''] })).toBe('Each address must be a non-empty string')
      expect(handler.validatePayload({ addresses: [1] } as any)).toBe('Each address must be a non-empty string')
    })
  })
})
