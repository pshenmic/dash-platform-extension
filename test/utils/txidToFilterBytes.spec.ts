import { txidToFilterBytes } from '../../src/utils/txidToFilterBytes'
import { bytesToHex, hexToBytes } from '../../src/utils'

// The asset lock transaction from the investigation: replaying testnet block
// 1538423 through subscribeToTransactionsWithProofs matched it only when the
// filter was seeded with these bytes, and matched nothing with the display order.
const TXID = '5cb7550547132d3cb7835d66e5298bd43d8e7a116ae27da9d6237e67df473b47'
const INTERNAL = '473b47df677e23d6a97de26a117a8e3dd48b29e5665d83b73c2d13470555b75c'

describe('txidToFilterBytes', () => {
  test('converts a display txid into internal byte order', () => {
    expect(bytesToHex(txidToFilterBytes(TXID))).toEqual(INTERNAL)
  })

  test('is its own inverse', () => {
    expect(bytesToHex(txidToFilterBytes(bytesToHex(txidToFilterBytes(TXID))))).toEqual(TXID)
  })

  test('does not return the display bytes, which never match the filter', () => {
    expect(bytesToHex(txidToFilterBytes(TXID))).not.toEqual(TXID)
  })

  test('leaves the caller a fresh array rather than mutating shared input', () => {
    const source = hexToBytes(TXID)
    const before = bytesToHex(source)

    txidToFilterBytes(TXID)

    expect(bytesToHex(source)).toEqual(before)
  })
})
