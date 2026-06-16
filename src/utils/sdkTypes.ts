import { KeyType } from 'dash-platform-sdk/types'
import type { Network as SdkNetwork } from 'dash-platform-sdk/types'
import type { KeyTypeLike, NetworkLike, PurposeLike } from 'pshenmic-dpp'
import type { NetworkType } from '../types/NetworkType'

export const toNetworkType = (network: string): NetworkType => {
  if (network === 'mainnet' || network === 'testnet') {
    return network
  }

  throw new Error(`Unsupported network: ${network}`)
}

export const toSdkNetwork = (network: string): SdkNetwork => toNetworkType(network)

export const toNetworkLike = (network: string): NetworkLike => toNetworkType(network)

export const parseKeyType = (keyType: string): KeyType => {
  if (keyType === 'ECDSA_SECP256K1') {
    return KeyType.ECDSA_SECP256K1
  }

  if (keyType === 'ECDSA_HASH160') {
    return KeyType.ECDSA_HASH160
  }

  throw new Error(`Unsupported key type: ${keyType}`)
}

export const toKeyTypeLike = (keyType: string): KeyTypeLike => parseKeyType(keyType)

export const toPurposeLike = (purpose: string): PurposeLike => purpose as PurposeLike
