import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKey } from 'dash-core-sdk'
import { parsePaymentAddress } from '../../src/utils/paymentAddress'

// Flips the last data character, which breaks the checksum and nothing else.
const breakChecksum = (address: string): string =>
  address.slice(0, -1) + (address.endsWith('q') ? 'p' : 'q')

describe('parsePaymentAddress', () => {
  const sdk = new DashPlatformSDK({ network: 'testnet' })
  const seed = new Uint8Array(64).fill(7)

  const coreTestnet = 'yVUKAMNURsDaGB4GFZgJUmYBoBJTW32stY'
  const coreMainnet = PrivateKey.fromBytes(new Uint8Array(32).fill(7), 'mainnet').getAddress()

  let platformTestnet: string
  let platformMainnet: string
  let orchardTestnet: string
  let orchardMainnet: string

  beforeAll(async () => {
    const platformAddress = await sdk.keyPair.derivePlatformAddress(seed, 'testnet', 0, 0)

    platformTestnet = platformAddress.toBech32m('testnet')
    platformMainnet = platformAddress.toBech32m('mainnet')
    orchardTestnet = sdk.keyPair.deriveShieldedAddress(seed, 'testnet', 0, 0).toBech32m('testnet')
    orchardMainnet = sdk.keyPair.deriveShieldedAddress(seed, 'mainnet', 0, 0).toBech32m('mainnet')
  })

  it('recognizes each kind of address of the wallet network', () => {
    expect(parsePaymentAddress(coreTestnet, 'testnet')).toEqual({ type: 'core', address: coreTestnet })
    expect(parsePaymentAddress(platformTestnet, 'testnet')).toEqual({ type: 'platform', address: platformTestnet })
    expect(parsePaymentAddress(orchardTestnet, 'testnet')).toEqual({ type: 'orchard', address: orchardTestnet })
  })

  it('takes a bech32m address in upper case and returns it canonical', () => {
    expect(parsePaymentAddress(platformTestnet.toUpperCase(), 'testnet').address).toBe(platformTestnet)
    expect(parsePaymentAddress(orchardTestnet.toUpperCase(), 'testnet').address).toBe(orchardTestnet)
  })

  it('refuses an address of the other network, naming it', () => {
    expect(() => parsePaymentAddress(coreMainnet, 'testnet'))
      .toThrow(`${coreMainnet} is a mainnet Core address, but the wallet is on testnet`)
    expect(() => parsePaymentAddress(platformMainnet, 'testnet'))
      .toThrow(`${platformMainnet} is a mainnet Platform address, but the wallet is on testnet`)
    expect(() => parsePaymentAddress(orchardMainnet, 'testnet'))
      .toThrow(`${orchardMainnet} is a mainnet Orchard address, but the wallet is on testnet`)
    expect(() => parsePaymentAddress(orchardTestnet, 'mainnet'))
      .toThrow(`${orchardTestnet} is a testnet Orchard address, but the wallet is on mainnet`)
  })

  it('refuses an address whose checksum does not match', () => {
    const core = coreTestnet.slice(0, -1) + (coreTestnet.endsWith('Y') ? 'Z' : 'Y')

    expect(() => parsePaymentAddress(core, 'testnet')).toThrow('is not a valid Core, Platform or Orchard address')
    expect(() => parsePaymentAddress(breakChecksum(platformTestnet), 'testnet')).toThrow('is not a valid Core, Platform or Orchard address')
    expect(() => parsePaymentAddress(breakChecksum(orchardTestnet), 'testnet')).toThrow('is not a valid Core, Platform or Orchard address')
  })

  it('does not take a shielded-looking prefix for an Orchard address', () => {
    expect(() => parsePaymentAddress('tdash1zqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq', 'testnet')).toThrow('is not a valid Core, Platform or Orchard address')
  })

  it('refuses an identity identifier and anything with surrounding whitespace', () => {
    expect(() => parsePaymentAddress('HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR', 'testnet')).toThrow('is not a valid')
    expect(() => parsePaymentAddress(` ${platformTestnet}`, 'testnet')).toThrow('is not a valid')
  })
})
