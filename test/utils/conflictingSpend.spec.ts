import { Input, Output, Script, Transaction } from 'dash-core-sdk'
import { findConflictingSpend } from '../../src/utils/conflictingSpend'
import { bytesToHex } from '../../src/utils'

// Whether a recorded payment is merely unseen or can never confirm. The answer
// comes from the payment's own inputs, so the transaction here is a real signed
// shape rather than a stand-in string.
describe('findConflictingSpend', () => {
  const PREV_TXID = `${'a'.repeat(63)}1`
  const PREV_VOUT = 3

  const transaction = new Transaction(
    [new Input(PREV_TXID, PREV_VOUT, Script.fromASM('OP_0'), 0xffffffff)],
    [Output.createP2PKH(100_000n, 'yYaCeiBLVeiDvR3ryAcTtifeRckEpbipBk')]
  )

  const txHex = bytesToHex(transaction.bytes())
  const txid = transaction.hash()

  let coreExplorer: any

  beforeEach(() => {
    coreExplorer = { getOutpointSpender: jest.fn(async () => null) }
  })

  it('reads the payment\'s own inputs and asks who holds them', async () => {
    expect(await findConflictingSpend(coreExplorer, txid, txHex, 'testnet')).toBeNull()

    expect(coreExplorer.getOutpointSpender).toHaveBeenCalledWith(PREV_TXID, PREV_VOUT, 'testnet')
  })

  it('names the transaction that took an input', async () => {
    coreExplorer.getOutpointSpender.mockResolvedValue('c'.repeat(64))

    expect(await findConflictingSpend(coreExplorer, txid, txHex, 'testnet')).toBe('c'.repeat(64))
  })

  // Confirmed, and it is this very payment that spent them: nothing conflicts.
  it('is not confused by the payment having been mined itself', async () => {
    coreExplorer.getOutpointSpender.mockResolvedValue(txid)

    expect(await findConflictingSpend(coreExplorer, txid, txHex, 'testnet')).toBeNull()
  })
})
