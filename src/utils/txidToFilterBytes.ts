import { hexToBytes } from './index'

/**
 * Converts a txid into the byte order a BIP37 bloom filter matches against.
 *
 * `Transaction.hash()` returns the *display* txid (`doubleSHA256(...).toReversed()`),
 * which is what explorers and RPC show. Dash Core compares the filter against the
 * *internal* hash, so a filter seeded with the display bytes never matches the
 * transaction and DAPI streams neither the transaction nor its InstantSend lock.
 *
 * Verified against testnet by replaying block 1538423 through
 * `subscribeToTransactionsWithProofs` with both orders: display order matched
 * nothing, internal order matched the asset lock transaction.
 */
export const txidToFilterBytes = (txid: string): Uint8Array => hexToBytes(txid).reverse()
