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
const PLATFORM_XPUB = 'platformXpub'
const CORE_XPUB = 'tpubCoreXpub'

describe('InitAccountXpubsHandler', () => {
  let walletRepository: any
  let sdk: any
  let handler: InitAccountXpubsHandler

  const handle = async (password: string = PASSWORD): Promise<any> =>
    await handler.handle({ context: 'dash-platform-extension', id: 'id', method: 'INIT_ACCOUNT_XPUBS', type: 'request', payload: { password } } as any)

  beforeEach(() => {
    jest.clearAllMocks()

    // Defaults model an older wallet: neither xpub has ever been cached.
    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1',
        type: WalletType.seedphrase,
        network: 'testnet',
        encryptedMnemonic: 'encryptedMnemonic',
        currentIdentity: null
      })),
      getPlatformAccountXpub: jest.fn(async () => null),
      setPlatformAccountXpub: jest.fn(async () => {}),
      getCoreAccountXpub: jest.fn(async () => null),
      setCoreAccountXpub: jest.fn(async () => {})
    }

    sdk = {}

    derivePlatformMock.mockResolvedValue(PLATFORM_XPUB)
    deriveCoreMock.mockResolvedValue(CORE_XPUB)

    handler = new InitAccountXpubsHandler(walletRepository, sdk)
  })

  test('caches both xpubs for a wallet that has neither', async () => {
    await expect(handle()).resolves.toEqual({ platform: true, core: true })

    expect(walletRepository.setPlatformAccountXpub).toHaveBeenCalledWith(0, PLATFORM_XPUB)
    expect(walletRepository.setCoreAccountXpub).toHaveBeenCalledWith(0, CORE_XPUB)
  })

  test('fills in only the missing one', async () => {
    walletRepository.getPlatformAccountXpub.mockResolvedValueOnce(PLATFORM_XPUB)

    await expect(handle()).resolves.toEqual({ platform: false, core: true })

    expect(derivePlatformMock).not.toHaveBeenCalled()
    expect(walletRepository.setCoreAccountXpub).toHaveBeenCalledWith(0, CORE_XPUB)
  })

  test('is a no-op once both are cached, so it is safe on every unlock', async () => {
    walletRepository.getPlatformAccountXpub.mockResolvedValueOnce(PLATFORM_XPUB)
    walletRepository.getCoreAccountXpub.mockResolvedValueOnce(CORE_XPUB)

    await expect(handle()).resolves.toEqual({ platform: false, core: false })

    expect(derivePlatformMock).not.toHaveBeenCalled()
    expect(deriveCoreMock).not.toHaveBeenCalled()
    expect(walletRepository.setPlatformAccountXpub).not.toHaveBeenCalled()
    expect(walletRepository.setCoreAccountXpub).not.toHaveBeenCalled()
  })

  test('passes the password through to both derivations', async () => {
    await handle('secret')

    expect(derivePlatformMock).toHaveBeenCalledWith(expect.objectContaining({ walletId: 'wallet1' }), 'secret', 0, sdk)
    expect(deriveCoreMock).toHaveBeenCalledWith(expect.objectContaining({ walletId: 'wallet1' }), 'secret', 0, sdk)
  })

  test('does nothing for a keystore wallet, which has no seed to derive from', async () => {
    walletRepository.getCurrent.mockResolvedValueOnce({ walletId: 'wallet1', type: WalletType.keystore, network: 'testnet' })

    await expect(handle()).resolves.toEqual({ platform: false, core: false })

    expect(deriveCoreMock).not.toHaveBeenCalled()
  })

  test('throws when no wallet is chosen', async () => {
    walletRepository.getCurrent.mockResolvedValueOnce(null)

    await expect(handle()).rejects.toThrow('No wallet is chosen')
  })

  test('validatePayload demands a password', () => {
    expect(handler.validatePayload({ password: 'x' })).toBeNull()
    expect(handler.validatePayload({ password: '' })).toBe('Password must be provided')
    expect(handler.validatePayload({} as any)).toBe('Password must be provided')
  })
})
