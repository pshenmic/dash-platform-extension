import { NetworkType } from '../../types/PlatformExplorer'
import { CORE_EXPLORER_URLS } from '../../constants'

export interface CoreAddressInfo {
  txCount: number
  balance: bigint
  received: bigint
  sent: bigint
}

export interface CoreAddressUtxo {
  txid: string
  vout: number
  amount: bigint
}

const getBaseUrl = (network: NetworkType = 'testnet'): string => {
  return CORE_EXPLORER_URLS[network].api
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
      txCount: Number(data.txCount ?? 0),
      balance: BigInt(data.balance ?? 0),
      received: BigInt(data.received ?? 0),
      sent: BigInt(data.sent ?? 0)
    }
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
      vout: Number(utxo.vOutIndex),
      amount: BigInt(utxo.amount ?? 0)
    }))
  }
}
