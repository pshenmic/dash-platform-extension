import { summarizeCoreTransaction } from '../../src/utils/coreTransactions'
import type { CoreExplorerTransaction } from '../../src/content-script/services/CoreExplorerService'

const OWN_RECEIVE = 'yOwnReceive0'
const OWN_CHANGE = 'yOwnChange0'
const WALLET = new Set([OWN_RECEIVE, OWN_CHANGE])

const tx = (inputs: CoreExplorerTransaction['inputs'], outputs: CoreExplorerTransaction['outputs']): CoreExplorerTransaction => ({
  hash: 'a'.repeat(64),
  type: 'CLASSIC',
  blockHeight: 100,
  timestamp: '2026-09-14T09:42:38.000Z',
  confirmations: 5,
  instantLocked: true,
  chainLocked: true,
  inputs,
  outputs
})

describe('summarizeCoreTransaction', () => {
  it('reads a payment from someone else as received, with no fee for the wallet', () => {
    const effect = summarizeCoreTransaction(tx(
      [{ address: 'ySender', amount: 5_000_226n }],
      [{ address: OWN_RECEIVE, amount: 2_000_000n }, { address: 'ySenderChange', amount: 3_000_000n }]
    ), WALLET)

    expect(effect).toEqual({
      direction: 'received',
      receivedDuffs: 2_000_000n,
      sentDuffs: 0n,
      amountDuffs: 2_000_000n,
      feeDuffs: null,
      counterparties: ['ySender']
    })
  })

  it('reads a payment by the wallet as sent: net amount includes the fee, change is not a counterparty', () => {
    // The shape of the real testnet transaction 96a08147…: 3M out, change back, 226 duffs fee.
    const effect = summarizeCoreTransaction(tx(
      [{ address: OWN_RECEIVE, amount: 99_998_622n }],
      [{ address: 'yFundingAddress', amount: 3_000_000n }, { address: OWN_CHANGE, amount: 96_998_396n }]
    ), WALLET)

    expect(effect).toEqual({
      direction: 'sent',
      receivedDuffs: 96_998_396n,
      sentDuffs: 99_998_622n,
      amountDuffs: -3_000_226n,
      feeDuffs: 226n,
      counterparties: ['yFundingAddress']
    })
  })

  it('reads a payment that only returns to the wallet as self, costing just the fee', () => {
    const effect = summarizeCoreTransaction(tx(
      [{ address: OWN_RECEIVE, amount: 1_000_000n }],
      [{ address: OWN_CHANGE, amount: 999_774n }]
    ), WALLET)

    expect(effect.direction).toBe('self')
    expect(effect.amountDuffs).toBe(-226n)
    expect(effect.feeDuffs).toBe(226n)
    expect(effect.counterparties).toEqual([])
  })

  it('leaves the fee unknown when an input value is missing', () => {
    const effect = summarizeCoreTransaction(tx(
      [{ address: OWN_RECEIVE, amount: 1_000_000n }, { address: 'yOther', amount: null }],
      [{ address: 'yRecipient', amount: 900_000n }]
    ), WALLET)

    expect(effect.direction).toBe('sent')
    expect(effect.feeDuffs).toBeNull()
  })

  it('reads a coinbase payout as received without a sender', () => {
    const effect = summarizeCoreTransaction(tx(
      [{ address: null, amount: null }],
      [{ address: OWN_RECEIVE, amount: 500_000_000n }]
    ), WALLET)

    expect(effect.direction).toBe('received')
    expect(effect.counterparties).toEqual([])
  })

  it('lists each counterparty once', () => {
    const effect = summarizeCoreTransaction(tx(
      [{ address: 'ySender', amount: 1_000_000n }, { address: 'ySender', amount: 1_000_000n }],
      [{ address: OWN_RECEIVE, amount: 1_999_774n }]
    ), WALLET)

    expect(effect.counterparties).toEqual(['ySender'])
  })
})
