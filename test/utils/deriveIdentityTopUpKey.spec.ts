import { PrivateKey, encrypt } from 'eciesjs'
import hash from 'hash.js'
import { PrivateKeyWASM } from 'dash-platform-sdk/types'
import { bytesToHex, hexToBytes, utf8ToBytes, deriveIdentityTopUpKey } from '../../src/utils'
import { WalletType, Wallet } from '../../src/types'

const MNEMONIC = 'wasp antenna garage uniform flavor forward skin illegal olive sense call town'
const DERIVED_KEY_HEX = '3ca33236ab14f6df6cf87fcbb0551544fee7dcf4f251557af02c175725764a5a'

const buildWallet = (network: 'testnet' | 'mainnet', password: string): Wallet => {
  const passwordHash = hash.sha256().update(password).digest('hex')
  const secretKey = PrivateKey.fromHex(passwordHash)
  const encryptedMnemonic = bytesToHex(encrypt(secretKey.publicKey.toHex(), utf8ToBytes(MNEMONIC)))

  return {
    walletId: 'wallet1',
    type: WalletType.seedphrase,
    network,
    label: null,
    encryptedMnemonic,
    seedHash: 'seedHash',
    currentIdentity: null
  } as unknown as Wallet
}

describe('deriveIdentityTopUpKey', () => {
  const password = 'test'

  const buildSdk = (): any => ({
    keyPair: {
      mnemonicToSeed: jest.fn(() => new Uint8Array(64)),
      seedToHdKey: jest.fn(() => ({ hd: true })),
      derivePath: jest.fn(async () => ({ privateKey: hexToBytes(DERIVED_KEY_HEX) }))
    }
  })

  it('derives at the DIP-0013 top-up funding path on testnet (coin 1)', async () => {
    const sdk = buildSdk()
    const wallet = buildWallet('testnet', password)

    const key = await deriveIdentityTopUpKey(wallet, password, 4, sdk)

    expect(sdk.keyPair.derivePath).toHaveBeenCalledWith({ hd: true }, "m/9'/1'/5'/2'/4")
    expect(key).toBeInstanceOf(PrivateKeyWASM)
    expect(key.hex().toLowerCase()).toBe(DERIVED_KEY_HEX)
  })

  it('uses coin type 5 on mainnet', async () => {
    const sdk = buildSdk()
    const wallet = buildWallet('mainnet', password)

    await deriveIdentityTopUpKey(wallet, password, 0, sdk)

    expect(sdk.keyPair.derivePath).toHaveBeenCalledWith({ hd: true }, "m/9'/5'/5'/2'/0")
  })

  it('throws when the SDK derives no private key', async () => {
    const sdk = buildSdk()
    sdk.keyPair.derivePath = jest.fn(async () => ({ privateKey: null }))
    const wallet = buildWallet('testnet', password)

    await expect(deriveIdentityTopUpKey(wallet, password, 1, sdk)).rejects.toThrow('Could not derive identity top-up key')
  })
})
