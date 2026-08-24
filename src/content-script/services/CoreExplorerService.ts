import { NetworkType } from '../../types/PlatformExplorer'
import { CORE_EXPLORER_ADDRESS_BATCH_LIMIT, CORE_EXPLORER_URLS } from '../../constants'

export interface CoreAddressInfo {
  txCount: number
  balance: bigint
  received: bigint
  sent: bigint
}

// The batch endpoint reports only what it can aggregate cheaply: no received /
// sent totals, unlike the single-address route.
export interface CoreAddressBalanceInfo {
  address: string
  balance: bigint
  txCount: number
}

export interface CoreAddressUtxo {
  txid: string
  vout: number
  amount: bigint
}

const getBaseUrl = (network: NetworkType = 'testnet'): string => {
  return CORE_EXPLORER_URLS[network].api
}

// dashscan returns amounts as integer strings (or null). Parse defensively so a
// malformed/changed field degrades to 0 instead of throwing an opaque RangeError.
const toBigInt = (value: unknown): bigint => {
  if (value == null) {
    return 0n
  }

  try {
    return BigInt(value as string | number)
  } catch {
    return 0n
  }
}

const toCount = (value: unknown): number => {
  const count = Number(value ?? 0)

  return Number.isFinite(count) ? count : 0
}

/**
 * Reads L1 (Dash Core) address state from the dashscan REST API.
 *
 * Exposes small primitives for the top-up funding-address flow: gap-scanning
 * derived addresses for the next unused index and reading UTXOs for recovery.
 * Deposit detection and instant-lock proofs stay on the P2P Core SDK — a block
 * indexer cannot produce an InstantLock proof.
 */
export class CoreExplorerService {
  // Returns null when the address has never been seen on-chain (dashscan
  // responds 404 for addresses with no indexed transactions).
  async getAddressInfo (address: string, network: NetworkType = 'testnet'): Promise<CoreAddressInfo | null> {
    const baseUrl = getBaseUrl(network)
    const response = await fetch(`${baseUrl}/address/${address}`)

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error(`Core explorer error for address ${address}: HTTP ${response.status}`)
    }

    const data = await response.json()

    return {
      txCount: toCount(data.txCount),
      balance: toBigInt(data.balance),
      received: toBigInt(data.received),
      sent: toBigInt(data.sent)
    }
  }

  // Balances for many addresses in one request. The explorer caps the query at
  // 100 addresses, so longer lists are sent in consecutive chunks. Addresses it
  // omits (never seen on-chain) are filled in as zeros, so the result always
  // lines up one-to-one with the input, in the same order.
  async getAddressesInfo (addresses: string[], network: NetworkType = 'testnet'): Promise<CoreAddressBalanceInfo[]> {
    if (addresses.length === 0) {
      return []
    }

    const baseUrl = getBaseUrl(network)
    const byAddress = new Map<string, CoreAddressBalanceInfo>()

    for (let offset = 0; offset < addresses.length; offset += CORE_EXPLORER_ADDRESS_BATCH_LIMIT) {
      const chunk = addresses.slice(offset, offset + CORE_EXPLORER_ADDRESS_BATCH_LIMIT)
      const response = await fetch(`${baseUrl}/addresses/info?addresses=${chunk.join(',')}`)

      if (!response.ok) {
        throw new Error(`Core explorer error for ${chunk.length} addresses: HTTP ${response.status}`)
      }

      const data = await response.json()
      const rows: any[] = Array.isArray(data) ? data : []

      for (const row of rows) {
        byAddress.set(row.address, {
          address: row.address,
          balance: toBigInt(row.balance),
          txCount: toCount(row.txCount)
        })
      }
    }

    return addresses.map(address =>
      byAddress.get(address) ?? { address, balance: 0n, txCount: 0 }
    )
  }

  // An address counts as used once it has appeared in at least one transaction.
  // Never-seen addresses (404) are free to claim for the gap-scan.
  async isAddressUsed (address: string, network: NetworkType = 'testnet'): Promise<boolean> {
    const info = await this.getAddressInfo(address, network)

    return info != null && info.txCount > 0
  }

  // Confirmed UTXOs for an address. Empty when the address is unseen or has no
  // spendable outputs. Used for recovery, not for first-deposit detection.
  async getAddressUtxos (address: string, network: NetworkType = 'testnet'): Promise<CoreAddressUtxo[]> {
    const baseUrl = getBaseUrl(network)
    const response = await fetch(`${baseUrl}/address/${address}/utxo`)

    if (response.status === 404) {
      return []
    }

    if (!response.ok) {
      throw new Error(`Core explorer error for address ${address} utxo: HTTP ${response.status}`)
    }

    const data = await response.json()
    const resultSet: any[] = Array.isArray(data?.resultSet) ? data.resultSet : []

    return resultSet.map((utxo) => ({
      txid: utxo.prevTxHash,
      vout: toCount(utxo.vOutIndex),
      amount: toBigInt(utxo.amount)
    }))
  }
}
