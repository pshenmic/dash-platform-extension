import { OrchardAddressWASM, PlatformAddressWASM } from 'pshenmic-dpp'
import { NetworkType } from '../types/NetworkType'
import { PaymentAddressType } from '../types/PaymentRequest'
import { coreAddressToScript } from './index'

export interface PaymentAddress {
  type: PaymentAddressType
  // Canonical form: bech32m addresses lower-cased, a Core address as given.
  address: string
}

const OTHER_NETWORK: Record<NetworkType, NetworkType> = {
  testnet: 'mainnet',
  mainnet: 'testnet'
}

const LABELS: Record<PaymentAddressType, string> = {
  core: 'Core',
  platform: 'Platform',
  orchard: 'Orchard'
}

const isCoreAddressOf = (address: string, network: NetworkType): boolean => {
  try {
    coreAddressToScript(address, network)

    return true
  } catch {
    return false
  }
}

// Both bech32m parsers check the checksum and the payload length, but accept
// either network's prefix. Encoding the parsed address for a network and
// comparing tells which one it belongs to.
const bech32mNetwork = (address: string, encode: (network: NetworkType) => string): NetworkType | null => {
  const lowered = address.toLowerCase()

  for (const network of ['testnet', 'mainnet'] as NetworkType[]) {
    if (encode(network) === lowered) {
      return network
    }
  }

  return null
}

const parseBech32m = (address: string): { type: PaymentAddressType, encode: (network: NetworkType) => string } | null => {
  try {
    const platformAddress = PlatformAddressWASM.fromBech32m(address)

    return { type: 'platform', encode: network => platformAddress.toBech32m(network) }
  } catch {}

  try {
    const orchardAddress = OrchardAddressWASM.fromBech32m(address)

    return { type: 'orchard', encode: network => orchardAddress.toBech32m(network) }
  } catch {}

  return null
}

/**
 * Parses a payment recipient in full: a Core base58check address with its
 * checksum and version byte, or a Platform or Orchard bech32m address with its
 * checksum, length and network prefix. Throws, naming what is wrong, for
 * anything that is not an address of `network` - including a valid address of
 * the other network, which would otherwise be paid on a chain it does not
 * belong to.
 */
export const parsePaymentAddress = (address: string, network: NetworkType): PaymentAddress => {
  if (isCoreAddressOf(address, network)) {
    return { type: 'core', address }
  }

  if (isCoreAddressOf(address, OTHER_NETWORK[network])) {
    throw new Error(`${address} is a ${OTHER_NETWORK[network]} Core address, but the wallet is on ${network}`)
  }

  const parsed = parseBech32m(address)

  if (parsed == null) {
    throw new Error(`${address} is not a valid Core, Platform or Orchard address`)
  }

  const addressNetwork = bech32mNetwork(address, parsed.encode)

  if (addressNetwork == null) {
    throw new Error(`${address} is not a valid ${LABELS[parsed.type]} address`)
  }

  if (addressNetwork !== network) {
    throw new Error(`${address} is a ${addressNetwork} ${LABELS[parsed.type]} address, but the wallet is on ${network}`)
  }

  return { type: parsed.type, address: parsed.encode(network) }
}
