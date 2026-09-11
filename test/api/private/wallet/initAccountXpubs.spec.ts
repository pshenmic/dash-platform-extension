import { InitAccountXpubsHandler } from '../../../../src/content-script/api/private/wallet/initAccountXpubs'
import { WalletType } from '../../../../src/types'
import { derivePlatformAccountXpub } from '../../../../src/utils'
import { deriveCoreAccountXpub } from '../../../../src/utils/coreAddresses'

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return { ...actual, derivePlatformAccountXpub: jest.fn() }
})

jest.mock('../../../../src/utils/coreAddresses', () => {
  const actual = jest.requireActual('../../../../src/utils/coreAddresses')
  return { ...actual, deriveCoreAccountXpub: jest.fn() }
})

const derivePlatformMock = derivePlatformAccountXpub as jest.MockedFunction<typeof derivePlatformAccountXpub>
const deriveCoreMock = deriveCoreAccountXpub as jest.MockedFunction<typeof deriveCoreAccountXpub>

const PASSWORD = 'test'

// Records keyed the way storage keys them: a wallet id is global, its record is
// per network, so the same id can exist on one network and not the other.
interface Record { platform?: string, core?: string, type?: WalletType }

describe('InitAccountXpubsHandler', () => {
  let records: Map<string, Record>
  let walletRepository: any
  let storageAdapter: any
  let sdk: any
  let handler: InitAccountXpubsHandler

  const key = (network: string, walletId: string): string => `${network}:${walletId}`

  const handle = async (password: string = PASSWORD): Promise<any> =>
    await handler.handle({ context: 'dash-platform-extension', id: 'id', method: 'INIT_ACCOUNT_XPUBS', type: 'request', payload: { password } } as any)

  // A repository pinned to one (network, wallet) pair, backed by `records`.
  const scopedFor = (scope: { network: string, walletId: string }): any => ({
    getCurrent: jest.fn(async () => {
      const record = records.get(key(scope.network, scope.walletId))

      if (record == null) {
        return null
      }

      return {
        walletId: scope.walletId,
        network: scope.network,
        type: record.type ?? WalletType.seedphrase,
        encryptedMnemonic: 'encryptedMnemonic'
      }
    }),
    getPlatformAccountXpub: jest.fn(async () => records.get(key(scope.network, scope.walletId))?.platform ?? null),
    getCoreAccountXpub: jest.fn(async () => records.get(key(scope.network, scope.walletId))?.core ?? null),
    setPlatformAccountXpub: jest.fn(async (_a: number, xpub: string) => {
      const record = records.get(key(scope.network, scope.walletId))
      if (record != null) {
        record.platform = xpub
      }
    }),
    setCoreAccountXpub: jest.fn(async (_a: number, xpub: string) => {
      const record = records.get(key(scope.network, scope.walletId))
      if (record != null) {
        record.core = xpub
      }
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()

    records = new Map()
    walletRepository = { forScope: jest.fn(scopedFor) }
    storageAdapter = { get: jest.fn(async () => []) }
    sdk = {}

    derivePlatformMock.mockResolvedValue('platformXpub')
    deriveCoreMock.mockResolvedValue('coreXpub')

    handler = new InitAccountXpubsHandler(walletRepository, storageAdapter, sdk)
  })

  const withWallets = (ids: string[], seed: Array<[string, string, Record]>): void => {
    storageAdapter.get = jest.fn(async () => ids)
    for (const [network, walletId, record] of seed) {
      records.set(key(network, walletId), record)
    }
  }

  test('caches both xpubs for a wallet that has neither', async () => {
    withWallets(['w1'], [['testnet', 'w1', {}]])

    const result = await handle()

    expect(result.initialized).toBe(2)
    expect(result.wallets).toEqual([{ walletId: 'w1', network: 'testnet', platform: true, core: true }])
    expect(records.get('testnet:w1')).toEqual({ platform: 'platformXpub', core: 'coreXpub' })
  })

  test('covers wallets on both networks in one call', async () => {
    withWallets(['w1', 'w2'], [
      ['mainnet', 'w1', {}],
      ['testnet', 'w2', {}]
    ])

    const result = await handle()

    expect(result.initialized).toBe(4)
    expect(result.wallets.map((w: any) => `${w.network as string}:${w.walletId as string}`)).toEqual(['mainnet:w1', 'testnet:w2'])
  })

  test('handles the same wallet id present on both networks', async () => {
    withWallets(['w1'], [
      ['mainnet', 'w1', {}],
      ['testnet', 'w1', {}]
    ])

    const result = await handle()

    expect(result.wallets).toHaveLength(2)
    expect(records.get('mainnet:w1')?.core).toBe('coreXpub')
    expect(records.get('testnet:w1')?.core).toBe('coreXpub')
  })

  test('fills in only what is missing', async () => {
    withWallets(['w1'], [['testnet', 'w1', { platform: 'alreadyThere' }]])

    const result = await handle()

    expect(result.initialized).toBe(1)
    expect(result.wallets).toEqual([{ walletId: 'w1', network: 'testnet', platform: false, core: true }])
    expect(derivePlatformMock).not.toHaveBeenCalled()
    expect(records.get('testnet:w1')?.platform).toBe('alreadyThere')
  })

  test('is a no-op once everything is cached, so it is safe on every unlock', async () => {
    withWallets(['w1'], [['testnet', 'w1', { platform: 'p', core: 'c' }]])

    const result = await handle()

    expect(result.initialized).toBe(0)
    expect(result.wallets).toEqual([{ walletId: 'w1', network: 'testnet', platform: false, core: false }])
    expect(derivePlatformMock).not.toHaveBeenCalled()
    expect(deriveCoreMock).not.toHaveBeenCalled()
  })

  test('skips keystore wallets, which have no seed to derive from', async () => {
    withWallets(['w1'], [['testnet', 'w1', { type: WalletType.keystore }]])

    const result = await handle()

    expect(result).toEqual({ initialized: 0, wallets: [], failed: [] })
    expect(deriveCoreMock).not.toHaveBeenCalled()
  })

  test('ignores ids with no record on either network', async () => {
    withWallets(['ghost'], [])

    await expect(handle()).resolves.toEqual({ initialized: 0, wallets: [], failed: [] })
  })

  test('reports an unreadable wallet instead of blocking the others', async () => {
    withWallets(['bad', 'good'], [
      ['testnet', 'bad', {}],
      ['testnet', 'good', {}]
    ])
    derivePlatformMock.mockImplementation(async (wallet: any) => {
      if (wallet.walletId === 'bad') {
        throw new Error('Failed to decrypt')
      }
      return 'platformXpub'
    })

    const result = await handle()

    expect(result.failed).toEqual([{ walletId: 'bad', network: 'testnet' }])
    expect(result.wallets).toEqual([{ walletId: 'good', network: 'testnet', platform: true, core: true }])
  })

  test('does not disturb the selected wallet: everything goes through a scope', async () => {
    withWallets(['w1'], [['testnet', 'w1', {}]])

    await handle()

    expect(walletRepository.forScope).toHaveBeenCalledWith({ network: 'mainnet', walletId: 'w1' })
    expect(walletRepository.forScope).toHaveBeenCalledWith({ network: 'testnet', walletId: 'w1' })
  })

  test('passes the password through to both derivations', async () => {
    withWallets(['w1'], [['testnet', 'w1', {}]])

    await handle('secret')

    expect(derivePlatformMock).toHaveBeenCalledWith(expect.objectContaining({ walletId: 'w1' }), 'secret', 0, sdk)
    expect(deriveCoreMock).toHaveBeenCalledWith(expect.objectContaining({ walletId: 'w1' }), 'secret', 0, sdk)
  })

  test('validatePayload demands a password', () => {
    expect(handler.validatePayload({ password: 'x' })).toBeNull()
    expect(handler.validatePayload({ password: '' })).toBe('Password must be provided')
    expect(handler.validatePayload({} as any)).toBe('Password must be provided')
  })
})
