import { NetworkType } from '../../types/PlatformExplorer'
import { CORE_EXPLORER_MAX_PAGE_LIMIT, CORE_EXPLORER_URLS } from '../../constants'

export interface CoreAddressInfo {
  txCount: number
  balance: bigint
  received: bigint
  sent: bigint
}

// Everything POST /xpub reports for one account.
export interface CoreXpubSummary {
  balance: bigint
  received: bigint
  sent: bigint
  txCount: number
  addressCount: number
  usedAddressCount: number
  // The explorer's own gap-scan: the next index it considers free on each chain.
  nextUnused: { receiving: number, change: number }
}

export interface CoreAddressUtxo {
  txid: string
  vout: number
  amount: bigint
}

// An account output, with the address that received it.
export interface CoreXpubUtxo extends CoreAddressUtxo {
  address: string
}

export interface CoreExplorerTransactionInput {
  // null for a coinbase input, which spends no address
  address: string | null
  // null when the explorer does not report the value of the spent output
  amount: bigint | null
}

export interface CoreExplorerTransactionOutput {
  // null for an output with no standard address (e.g. OP_RETURN)
  address: string | null
  amount: bigint
}

// A transaction as the explorer reports it, trimmed to what describes a payment.
export interface CoreExplorerTransaction {
  hash: string
  type: string
  // null while the transaction is still in the mempool
  blockHeight: number | null
  timestamp: string | null
  confirmations: number
  instantLocked: boolean
  chainLocked: boolean
  inputs: CoreExplorerTransactionInput[]
  outputs: CoreExplorerTransactionOutput[]
}

export interface CoreExplorerTransactionsPage {
  transactions: CoreExplorerTransaction[]
  // Pass back to get the next page; null on the last one.
  nextCursor: string | null
}

// Largest page the explorer serves for its /xpub list endpoints.
const XPUB_PAGE_LIMIT = 100

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

const toAddress = (value: unknown): string | null => {
  return typeof value === 'string' && value !== '' ? value : null
}

// Input amounts arrive as strings, output values as numbers.
const toTransaction = (row: any): CoreExplorerTransaction => ({
  hash: String(row.hash),
  type: String(row.type),
  blockHeight: row.blockHeight == null ? null : toCount(row.blockHeight),
  timestamp: typeof row.timestamp === 'string' ? row.timestamp : null,
  // The explorer reports no confirmations for a transaction still in the mempool.
  confirmations: toCount(row.confirmations),
  instantLocked: typeof row.instantLock === 'string' && row.instantLock !== '',
  chainLocked: row.chainLocked === true,
  inputs: (Array.isArray(row.vIn) ? row.vIn : []).map((input: any) => ({
    address: toAddress(input.address),
    amount: input.amount == null ? null : toBigInt(input.amount)
  })),
  outputs: (Array.isArray(row.vOut) ? row.vOut : []).map((output: any) => ({
    address: toAddress(output.address),
    amount: toBigInt(output.value)
  }))
})

const postJson = async (url: string, body: object): Promise<Response> => {
  return await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
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

  // Account totals for an extended public key. The explorer walks the xpub's
  // own chains, so this covers every address it derives, including ones this
  // install never created. `nextUnused` is the explorer's own gap-scan result.
  async getXpubSummary (xpub: string, network: NetworkType = 'testnet'): Promise<CoreXpubSummary> {
    const baseUrl = getBaseUrl(network)

    const response = await fetch(`${baseUrl}/xpub`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xpub })
    })

    if (!response.ok) {
      throw new Error(`Core explorer error for xpub summary: HTTP ${response.status}`)
    }

    const data = await response.json()

    return {
      balance: toBigInt(data.balance),
      received: toBigInt(data.received),
      sent: toBigInt(data.sent),
      txCount: toCount(data.txCount),
      addressCount: toCount(data.addressCount),
      usedAddressCount: toCount(data.usedAddressCount),
      nextUnused: {
        receiving: toCount(data.nextUnused?.receive),
        change: toCount(data.nextUnused?.change)
      }
    }
  }

  // Every address the explorer derives for the xpub, on both chains up to its gap
  // limit: the same set it matches transactions against. Walks all the pages.
  async getXpubAddresses (xpub: string, network: NetworkType = 'testnet'): Promise<string[]> {
    const baseUrl = getBaseUrl(network)
    const addresses: string[] = []

    let fetched = 0
    for (let page = 1; ; page++) {
      const response = await postJson(`${baseUrl}/xpub/addresses`, { xpub, page, limit: CORE_EXPLORER_MAX_PAGE_LIMIT })

      if (!response.ok) {
        throw new Error(`Core explorer error for xpub addresses: HTTP ${response.status}`)
      }

      const data = await response.json()
      const rows: any[] = Array.isArray(data?.resultSet) ? data.resultSet : []

      fetched += rows.length
      for (const row of rows) {
        const address = toAddress(row.address)

        if (address != null) {
          addresses.push(address)
        }
      }

      if (rows.length === 0 || fetched >= toCount(data?.pagination?.total)) {
        return addresses
      }
    }
  }

  // One page of the transactions touching the xpub's addresses, newest first.
  // The first page also carries every mempool transaction, ahead of the
  // confirmed ones. `cursor` is the previous page's `nextCursor`.
  async getXpubTransactions (xpub: string, network: NetworkType = 'testnet', limit: number, cursor?: string): Promise<CoreExplorerTransactionsPage> {
    const baseUrl = getBaseUrl(network)
    const response = await postJson(`${baseUrl}/xpub/transactions`, cursor == null ? { xpub, limit } : { xpub, limit, cursor })

    if (!response.ok) {
      throw new Error(`Core explorer error for xpub transactions: HTTP ${response.status}`)
    }

    const data = await response.json()
    const rows: any[] = Array.isArray(data?.resultSet) ? data.resultSet : []
    const nextCursor = data?.pagination?.nextCursor

    return {
      transactions: rows.map(toTransaction),
      nextCursor: typeof nextCursor === 'string' && nextCursor !== '' ? nextCursor : null
    }
  }

  // An address counts as used once it has appeared in at least one transaction.
  // Never-seen addresses (404) are free to claim for the gap-scan.
  async isAddressUsed (address: string, network: NetworkType = 'testnet'): Promise<boolean> {
    const info = await this.getAddressInfo(address, network)

    return info != null && info.txCount > 0
  }

  // Every confirmed output the account can spend, across both of the xpub's
  // chains, so an asset lock can be funded without deriving addresses locally and
  // asking about each one. Paged: the explorer caps a page at XPUB_PAGE_LIMIT and
  // reports the total, which is how the walk knows it is done.
  async getXpubUtxos (xpub: string, network: NetworkType = 'testnet'): Promise<CoreXpubUtxo[]> {
    const baseUrl = getBaseUrl(network)
    const utxos: CoreXpubUtxo[] = []

    let fetched = 0
    for (let page = 1; ; page++) {
      const response = await fetch(`${baseUrl}/xpub/utxo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xpub, page, limit: XPUB_PAGE_LIMIT })
      })

      if (!response.ok) {
        throw new Error(`Core explorer error for xpub utxo: HTTP ${response.status}`)
      }

      const data = await response.json()
      const rows: any[] = Array.isArray(data?.resultSet) ? data.resultSet : []

      fetched += rows.length
      for (const row of rows) {
        if (typeof row.address === 'string' && typeof row.prevTxHash === 'string') {
          utxos.push({ address: row.address, txid: row.prevTxHash, vout: toCount(row.vOutIndex), amount: toBigInt(row.amount) })
        }
      }

      if (rows.length === 0 || fetched >= toCount(data?.pagination?.total)) {
        return utxos
      }
    }
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
