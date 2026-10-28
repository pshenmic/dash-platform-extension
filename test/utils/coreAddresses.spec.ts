import { DashPlatformSDK } from 'dash-platform-sdk'
import { deriveCoreAccountXpub, deriveCoreAddressesFromXpub } from '../../src/utils/coreAddresses'
import { CoreAddressChain } from '../../src/types/enums/CoreAddressChain'
import { WalletType } from '../../src/types/WalletType'
import { PrivateKey, encrypt } from 'eciesjs'
import hash from 'hash.js'
import { bytesToHex, utf8ToBytes } from '../../src/utils'

// The BIP39 test mnemonic. Its BIP44 Dash addresses are stable, so they double
// as fixed vectors: a change in derivation shows up here rather than in the field.
const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const PASSWORD = 'test'

const VECTORS = {
  mainnet: {
    receiving: ['XoJA8qE3N2Y3jMLEtZ3vcN42qseZ8LvFf5'],
    change: ['XeBdurzVrhrFtgqf9SxzQqvhHodb53njW4']
  },
  testnet: {
    receiving: ['yRd4FhXfVGHXpsuZXPNkMrfD9GVj46pnjt', 'yfd64jEpzzTLrHnR1wq3iiYXh68AiU8mcw'],
    change: ['yNwHG9D2rnrJRQ8j7TG6xnWfbr8D634HeM']
  }
}

const buildWallet = (network: 'mainnet' | 'testnet'): any => {
  const passwordHash = hash.sha256().update(PASSWORD).digest('hex')
  const passwordPublicKey = PrivateKey.fromHex(passwordHash).publicKey.toHex()

  return {
    walletId: 'wallet1',
    type: WalletType.seedphrase,
    network,
    label: null,
    encryptedMnemonic: bytesToHex(encrypt(passwordPublicKey, utf8ToBytes(MNEMONIC))),
    seedHash: 'seedHash',
    currentIdentity: null
  }
}

describe('core address derivation', () => {
  const networks: Array<'mainnet' | 'testnet'> = ['mainnet', 'testnet']

  describe.each(networks)('%s', (network) => {
    const sdk = new DashPlatformSDK({ network })
    let xpub: string

    beforeAll(async () => {
      xpub = await deriveCoreAccountXpub(buildWallet(network), PASSWORD, 0, sdk)
    })

    test('derives the account xpub with the network extended-key prefix', () => {
      expect(xpub.startsWith(network === 'mainnet' ? 'xpub' : 'tpub')).toBe(true)
    })

    test.each([CoreAddressChain.receiving, CoreAddressChain.change])('matches the known vectors on the %s chain', (chain) => {
      const expected = VECTORS[network][chain]
      const entries = deriveCoreAddressesFromXpub(sdk, xpub, network, 0, chain, expected.length)

      expect(entries.map(entry => entry.address)).toEqual(expected)
    })

    test('labels every entry with its chain, index and BIP44 path', () => {
      const coinType = network === 'mainnet' ? 5 : 1
      const entries = deriveCoreAddressesFromXpub(sdk, xpub, network, 0, CoreAddressChain.change, 2)

      expect(entries).toEqual([
        { address: expect.any(String), derivationPath: `m/44'/${coinType}'/0'/1/0`, index: 0, chain: CoreAddressChain.change },
        { address: expect.any(String), derivationPath: `m/44'/${coinType}'/0'/1/1`, index: 1, chain: CoreAddressChain.change }
      ])
    })

    test('the two chains never produce the same address', () => {
      const receiving = deriveCoreAddressesFromXpub(sdk, xpub, network, 0, CoreAddressChain.receiving, 5)
      const change = deriveCoreAddressesFromXpub(sdk, xpub, network, 0, CoreAddressChain.change, 5)

      const overlap = receiving.filter(entry => change.some(other => other.address === entry.address))

      expect(overlap).toEqual([])
    })

    test('start offsets the index without shifting the address', () => {
      const all = deriveCoreAddressesFromXpub(sdk, xpub, network, 0, CoreAddressChain.receiving, 3)
      const tail = deriveCoreAddressesFromXpub(sdk, xpub, network, 0, CoreAddressChain.receiving, 1, 2)

      expect(tail).toEqual([all[2]])
    })
  })

  test('rejects a non-seedphrase wallet', async () => {
    const sdk = new DashPlatformSDK({ network: 'testnet' })
    const wallet = { ...buildWallet('testnet'), type: WalletType.keystore }

    await expect(deriveCoreAccountXpub(wallet, PASSWORD, 0, sdk))
      .rejects.toThrow('Core addresses can only be derived from a seedphrase wallet')
  })

  test('derives a distinct xpub per account', async () => {
    const sdk = new DashPlatformSDK({ network: 'testnet' })
    const wallet = buildWallet('testnet')

    const [first, second] = await Promise.all([
      deriveCoreAccountXpub(wallet, PASSWORD, 0, sdk),
      deriveCoreAccountXpub(wallet, PASSWORD, 1, sdk)
    ])

    expect(first).not.toEqual(second)
  })
})
