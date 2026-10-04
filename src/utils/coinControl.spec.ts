import { summarizeCoinControl } from './coinControl'
import type { CoreUtxo, ShieldedNote } from '../ui/states/sendTransaction/types'

const UTXOS: CoreUtxo[] = [
  { txid: 'a', vout: 0, address: 'y1', amount: '100', timestamp: 0, confirmations: 1 },
  { txid: 'b', vout: 1, address: 'y2', amount: '50', timestamp: 0, confirmations: 1 }
]
const NOTES: ShieldedNote[] = [{ noteId: 'n1', address: 's1', amount: '7' }]

describe('summarizeCoinControl', () => {
  it('counts only UTXOs and notes that still exist', () => {
    expect(summarizeCoinControl({ type: 'utxo', inputs: [{ txid: 'a', vout: 0 }, { txid: 'gone', vout: 0 }] }, UTXOS, NOTES)).toEqual({ count: 1, total: 100n })
    expect(summarizeCoinControl({ type: 'shieldedNotes', noteIds: ['n1', 'gone'] }, UTXOS, NOTES)).toEqual({ count: 1, total: 7n })
  })

  it('sums platform input amounts', () => {
    expect(summarizeCoinControl({ type: 'platformInputs', inputs: [{ address: 'p1', amount: '3' }, { address: 'p2', amount: '4' }] }, UTXOS, NOTES)).toEqual({ count: 2, total: 7n })
  })

  it('is empty for automatic', () => {
    expect(summarizeCoinControl({ type: 'automatic' }, UTXOS, NOTES)).toEqual({ count: 0, total: 0n })
  })
})
