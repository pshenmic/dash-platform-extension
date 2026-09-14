import { coreTransactionEffect } from './coreTransactions'
import type { CoreTransactionData } from '../types/CoreExplorer'

const OURS = 'yOurAddress0000000000000000000000'
const OUR_CHANGE = 'yOurChange00000000000000000000000'
const THEIRS = 'yTheirAddress00000000000000000000'

const owned = new Set([OURS, OUR_CHANGE])

const transaction = (
  vIn: Array<{ address: string | null, amount: string | number | null }>,
  vOut: Array<{ address: string | null, value: string | number | null }>
): CoreTransactionData => ({
  hash: 'hash',
  type: 'CLASSIC',
  blockHeight: 1,
  blockHash: 'block',
  timestamp: '2026-09-01T00:00:00.000Z',
  amount: null,
  version: 3,
  vIn: vIn.map(input => ({ ...input, prevTxHash: null, vOutIndex: null, sequence: null, scriptSigASM: null })),
  vOut: vOut.map((output, number) => ({ ...output, number, scriptPubKeyASM: null })),
  confirmations: 1,
  instantLock: null,
  chainLocked: true,
  coinjoin: false,
  multisig: false
})

describe('coreTransactionEffect', () => {
  it('reads an incoming payment as the amount our addresses received', () => {
    const effect = coreTransactionEffect(
      transaction([{ address: THEIRS, amount: '100000000' }], [{ address: OURS, value: '90000000' }]),
      owned
    )

    expect(effect).toEqual({ direction: 'in', amount: 90000000n, counterparty: THEIRS })
  })

  it('nets change back out of an outgoing payment', () => {
    const effect = coreTransactionEffect(
      transaction(
        [{ address: OURS, amount: '100000000' }],
        [{ address: THEIRS, value: '30000000' }, { address: OUR_CHANGE, value: '69000000' }]
      ),
      owned
    )

    // Spent 1 DASH, got 0.69 back as change: 0.31 left the wallet, fee included.
    expect(effect).toEqual({ direction: 'out', amount: 31000000n, counterparty: THEIRS })
  })

  it('treats a transfer between our own addresses as neutral', () => {
    const effect = coreTransactionEffect(
      transaction([{ address: OURS, amount: '50000000' }], [{ address: OUR_CHANGE, value: '50000000' }]),
      owned
    )

    expect(effect).toEqual({ direction: 'neutral', amount: 0n, counterparty: '' })
  })

  it('accepts numeric amounts and survives missing ones', () => {
    const effect = coreTransactionEffect(
      transaction([{ address: null, amount: null }], [{ address: OURS, value: 58942715 }]),
      owned
    )

    expect(effect).toEqual({ direction: 'in', amount: 58942715n, counterparty: '' })
  })
})
