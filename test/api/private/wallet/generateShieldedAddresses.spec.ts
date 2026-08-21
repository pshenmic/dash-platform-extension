import { GenerateShieldedAddressesHandler } from '../../../../src/content-script/api/private/wallet/generateShieldedAddresses'
import { deriveShieldedAddresses } from '../../../../src/utils'

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    deriveShieldedAddresses: jest.fn()
  }
})

const deriveShieldedAddressesMock = deriveShieldedAddresses as jest.MockedFunction<typeof deriveShieldedAddresses>

describe('GenerateShieldedAddressesHandler', () => {
  let walletRepository: any
  let sdk: any
  let handler: GenerateShieldedAddressesHandler

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1',
        type: 'seedphrase',
        network: 'testnet',
        label: null,
        encryptedMnemonic: 'encryptedMnemonic',
        seedHash: 'seedHash',
        currentIdentity: null
      })),
      getShieldedAddressCount: jest.fn(async () => 0),
      setShieldedAddressCount: jest.fn(async () => {})
    }

    sdk = {}

    deriveShieldedAddressesMock.mockImplementation((_wallet, _password, account, count, _sdk, start = 0) => {
      const entries: Array<{ address: string, derivationPath: string, diversifierIndex: number }> = []
      for (let index = start; index < start + count; index++) {
        entries.push({ address: `orchardAddress${index}`, derivationPath: `m/32'/1'/${account}'`, diversifierIndex: index })
      }

      return entries
    })

    handler = new GenerateShieldedAddressesHandler(walletRepository, sdk)
  })

  const handle = async (payload: any = { password: 'password' }): Promise<any> => {
    return await handler.handle({
      context: 'dash-platform-extension',
      id: 'id',
      method: 'GENERATE_SHIELDED_ADDRESSES',
      payload
    } as any)
  }

  it('should derive the first address and persist the count', async () => {
    const response = await handle()

    expect(deriveShieldedAddressesMock).toHaveBeenCalledWith(expect.anything(), 'password', 0, 1, sdk, 0)
    expect(response.addresses).toEqual([
      { address: 'orchardAddress0', derivationPath: "m/32'/1'/0'", diversifierIndex: 0 }
    ])
    expect(walletRepository.setShieldedAddressCount).toHaveBeenCalledWith(0, 1)
  })

  it('should continue from the stored count', async () => {
    walletRepository.getShieldedAddressCount.mockResolvedValue(3)

    const response = await handle()

    expect(deriveShieldedAddressesMock).toHaveBeenCalledWith(expect.anything(), 'password', 0, 1, sdk, 3)
    expect(response.addresses[0].diversifierIndex).toEqual(3)
    expect(walletRepository.setShieldedAddressCount).toHaveBeenCalledWith(0, 4)
  })

  it('should throw when no wallet is chosen', async () => {
    walletRepository.getCurrent.mockResolvedValue(null)

    await expect(handle()).rejects.toThrow('No wallet is chosen')
  })

  it('should throw for a non-seedphrase wallet', async () => {
    walletRepository.getCurrent.mockResolvedValue({ walletId: 'wallet1', type: 'keystore', network: 'testnet' })

    await expect(handle()).rejects.toThrow('Shielded addresses can only be generated for a seedphrase wallet')
  })

  it('should reject a payload without a password', () => {
    expect(handler.validatePayload({} as any)).toEqual('Password must be provided')
  })

  it('should reject account', () => {
    expect(handler.validatePayload({ password: 'password', account: 0 } as any)).toEqual('Account is not supported')
  })

  it('should reject an invalid count', () => {
    expect(handler.validatePayload({ password: 'password', count: 0 } as any)).toEqual('Count must be a positive integer')
    expect(handler.validatePayload({ password: 'password', count: 1.5 } as any)).toEqual('Count must be a positive integer')
    expect(handler.validatePayload({ password: 'password', count: 2 } as any)).toEqual(null)
  })

  it('should derive the requested count', async () => {
    walletRepository.getShieldedAddressCount.mockResolvedValue(2)

    const response = await handle({ password: 'password', count: 3 })

    expect(deriveShieldedAddressesMock).toHaveBeenCalledWith(expect.anything(), 'password', 0, 3, sdk, 2)
    expect(response.addresses.map((entry: any) => entry.diversifierIndex)).toEqual([2, 3, 4])
    expect(walletRepository.setShieldedAddressCount).toHaveBeenCalledWith(0, 5)
  })
})
