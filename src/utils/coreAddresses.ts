import { HDKey } from '@scure/bip32'
import { PrivateKey } from 'dash-core-sdk'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network } from 'dash-platform-sdk/types'
import { Wallet } from '../types/Wallet'
import { NetworkType } from '../types/NetworkType'
import { CoreAddressChain } from '../types/enums/CoreAddressChain'
import { CORE_BIP32_VERSIONS } from '../constants'
import { decryptMnemonic } from './index'

// BIP44 derivation for Core (L1) addresses: m/44'/coin'/account'/chain/index.
//
// dash-core-sdk has no HD derivation at all, and dash-platform-sdk stops one
// step short — derivePlatformAddressFromXpub returns a DIP-17 platform address,
// not a P2PKH one — so the xpub expansion is done here with @scure/bip32 and
// only the final encoding is handed back to the SDK. This is the single file to
// replace if that derivation later moves into an SDK.

export interface CoreAddressEntry {
  address: string
  derivationPath: string
  index: number
  chain: CoreAddressChain
}

// BIP44 chain element: 0 is the external chain (addresses handed to payers),
// 1 the internal one (change outputs).
const CHAIN_INDEX: Record<CoreAddressChain, number> = {
  [CoreAddressChain.receiving]: 0,
  [CoreAddressChain.change]: 1
}

// SLIP-44 registered coin type for Dash, and 1 for every testnet.
const coinType = (network: NetworkType): number => network === 'mainnet' ? 5 : 1

// Derive the BIP44 account-level extended public key (m/44'/coin'/account').
// Needs the password (decrypts the seed), but only once per account — the xpub
// then derives every chain and index publicly, with no further access to the seed.
export const deriveCoreAccountXpub = async (wallet: Wallet, password: string, account: number, sdk: DashPlatformSDK): Promise<string> => {
  if (wallet.type !== 'seedphrase') {
    throw new Error('Core addresses can only be derived from a seedphrase wallet')
  }

  const seed = sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, password))
  const hdKey = sdk.keyPair.seedToHdKey(seed, wallet.network as Network)
  const accountKey = await sdk.keyPair.derivePath(hdKey, `m/44'/${coinType(wallet.network)}'/${account}'`)

  return accountKey.publicExtendedKey
}

// Derive `count` P2PKH Core addresses on one chain from an account xpub. Chain
// and index are both non-hardened, so public-only derivation reproduces exactly
// what the private path would — no seed or password required.
//
// The xpub is passed as a string rather than an HDKey on purpose: the SDK builds
// its own HDKey instances, and keeping the boundary to a string means a
// duplicated @scure/bip32 copy in the tree could never produce a cross-instance
// mismatch here.
export const deriveCoreAddressesFromXpub = (
  sdk: DashPlatformSDK,
  xpub: string,
  network: NetworkType,
  account: number,
  chain: CoreAddressChain,
  count: number,
  start: number = 0
): CoreAddressEntry[] => {
  // Testnet extended keys carry tpub version bytes, which @scure/bip32 rejects
  // against its Bitcoin-mainnet defaults; pass the network's pair explicitly.
  const accountKey = HDKey.fromExtendedKey(xpub, CORE_BIP32_VERSIONS[network])
  const chainKey = accountKey.deriveChild(CHAIN_INDEX[chain])

  const entries: CoreAddressEntry[] = []
  for (let offset = 0; offset < count; offset++) {
    const index = start + offset
    const address = sdk.keyPair.p2pkhAddress(chainKey.deriveChild(index).publicKey as Uint8Array, network as Network)
    const derivationPath = `m/44'/${coinType(network)}'/${account}'/${CHAIN_INDEX[chain]}/${index}`

    entries.push({ address, derivationPath, index, chain })
  }

  return entries
}

// Derives the key for one of our Core addresses: m/44'/coin'/account'/chain/index,
// the private counterpart of `deriveCoreAddressesFromXpub`. Takes an already built
// wallet HD key so that spending several inputs decrypts the seed only once.
//
// Returns a dash-core-sdk key because its only use is signing an L1 transaction.
export const deriveCoreAddressPrivateKey = async (
  walletHdKey: HDKey,
  network: NetworkType,
  account: number,
  chain: CoreAddressChain,
  index: number,
  sdk: DashPlatformSDK
): Promise<PrivateKey> => {
  const path = `m/44'/${coinType(network)}'/${account}'/${CHAIN_INDEX[chain]}/${index}`
  const { privateKey } = await sdk.keyPair.derivePath(walletHdKey, path)

  if (privateKey == null) {
    throw new Error(`Could not derive Core address private key at ${path}`)
  }

  return PrivateKey.fromBytes(privateKey, network)
}
