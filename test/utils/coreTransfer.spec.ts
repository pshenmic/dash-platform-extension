import { buildCoreTransfer, estimateCoreFee, estimateCoreTxSize, selectCoreUtxos } from '../../src/utils/coreTransfer'
import { CoreWalletUtxo } from '../../src/content-script/services/CoreExplorerService'
import { CORE_DUST_THRESHOLD } from '../../src/constants'

// Valid testnet P2PKH addresses (base58check over a fixed hash160), so the real
// address decoding runs instead of being stubbed.
const RECIPIENT = 'yLQmwB9hninHD8Ceh2UAqLFWCzirppNLik'
const CHANGE = 'yed5KHEApak7fxVNPAVYUpHMwb4yM1bfT9'

const utxo = (address: string, amount: bigint, vout = 0): CoreWalletUtxo => ({
  txid: `${address.slice(1, 5)}${vout}`.padEnd(64, '0'),
  vout,
  amount,
  address
})

// One input paying a recipient plus change: 226 bytes at Dash's relay rate of
// 1 duff/byte. Two inputs make it 374.
const FEE_1_IN = 226n
const FEE_2_IN = 374n

describe('estimateCoreFee', () => {
  it('measures a P2PKH transaction by its parts', () => {
    expect(estimateCoreTxSize(1, 2)).toBe(226)
    expect(estimateCoreTxSize(2, 1)).toBe(340)
  })

  it('charges Dash\'s relay rate of one duff per byte, with no floor on top', () => {
    expect(estimateCoreFee(1, 2)).toBe(FEE_1_IN)
    expect(estimateCoreFee(2, 2)).toBe(FEE_2_IN)
  })
})

describe('selectCoreUtxos', () => {
  it('spends the single largest output that covers amount + fee', () => {
    const candidates = [utxo(RECIPIENT, 5_000n), utxo(CHANGE, 100_000n, 1), utxo(RECIPIENT, 20_000n, 2)]

    const selection = selectCoreUtxos(candidates, 10_000n)

    expect(selection.inputs).toHaveLength(1)
    expect(selection.inputs[0].amount).toBe(100_000n)
    expect(selection.fee).toBe(FEE_1_IN)
    expect(selection.change).toBe(100_000n - 10_000n - FEE_1_IN)
  })

  it('accumulates outputs largest first until the amount is covered', () => {
    const candidates = [utxo(RECIPIENT, 6_000n), utxo(CHANGE, 7_000n, 1), utxo(RECIPIENT, 1_000n, 2)]

    const selection = selectCoreUtxos(candidates, 10_000n)

    expect(selection.inputs.map(input => input.amount)).toEqual([7_000n, 6_000n])
    expect(selection.totalIn).toBe(13_000n)
    expect(selection.fee).toBe(FEE_2_IN)
    expect(selection.change).toBe(13_000n - 10_000n - FEE_2_IN)
  })

  it('drops a dust change into the fee instead of creating the output', () => {
    // Leftover after the fee is exactly the dust threshold, which is not enough
    // to be worth an output.
    const candidates = [utxo(RECIPIENT, 10_000n + FEE_1_IN + CORE_DUST_THRESHOLD)]

    const selection = selectCoreUtxos(candidates, 10_000n)

    expect(selection.change).toBe(0n)
    expect(selection.fee).toBe(FEE_1_IN + CORE_DUST_THRESHOLD)
  })

  it('keeps a change output that clears the dust threshold', () => {
    const candidates = [utxo(RECIPIENT, 10_000n + FEE_1_IN + CORE_DUST_THRESHOLD + 1n)]

    const selection = selectCoreUtxos(candidates, 10_000n)

    expect(selection.change).toBe(CORE_DUST_THRESHOLD + 1n)
    expect(selection.fee).toBe(FEE_1_IN)
  })

  it('still sends when the funds only cover a transaction without change', () => {
    // Enough for the 192-byte one-output form, short of the 226-byte one with change.
    const candidates = [utxo(RECIPIENT, 10_200n)]

    const selection = selectCoreUtxos(candidates, 10_000n)

    expect(selection.change).toBe(0n)
    expect(selection.fee).toBe(200n)
  })

  it('ignores outputs with no value', () => {
    const candidates = [utxo(RECIPIENT, 0n), utxo(CHANGE, 50_000n, 1)]

    const selection = selectCoreUtxos(candidates, 10_000n)

    expect(selection.inputs).toHaveLength(1)
    expect(selection.inputs[0].amount).toBe(50_000n)
  })

  it('throws when the outputs cannot cover the amount plus the fee', () => {
    const candidates = [utxo(RECIPIENT, 10_000n), utxo(CHANGE, 100n, 1)]

    expect(() => selectCoreUtxos(candidates, 10_000n)).toThrow(/Insufficient funds: 10100 duffs available/)
  })

  it('rejects an amount that would itself be dust', () => {
    expect(() => selectCoreUtxos([utxo(RECIPIENT, 100_000n)], CORE_DUST_THRESHOLD)).toThrow(/Minimum Core transfer/)
  })
})

describe('buildCoreTransfer', () => {
  const inputs = [utxo(CHANGE, 100_000n), utxo(CHANGE, 50_000n, 3)]

  it('pays the recipient and returns the change to our own address', () => {
    const transaction = buildCoreTransfer(inputs, RECIPIENT, 10_000n, CHANGE, 5_000n, 'testnet')

    expect(transaction.outputs).toHaveLength(2)
    expect(transaction.outputs[0].satoshis).toBe(10_000n)
    expect(transaction.outputs[0].getAddress('testnet')).toBe(RECIPIENT)
    expect(transaction.outputs[1].satoshis).toBe(5_000n)
    expect(transaction.outputs[1].getAddress('testnet')).toBe(CHANGE)
  })

  it('omits the change output when there is no change', () => {
    const transaction = buildCoreTransfer(inputs, RECIPIENT, 10_000n, CHANGE, 0n, 'testnet')

    expect(transaction.outputs).toHaveLength(1)
  })

  it('carries one final input per selected output', () => {
    const transaction = buildCoreTransfer(inputs, RECIPIENT, 10_000n, CHANGE, 5_000n, 'testnet')

    expect(transaction.inputs.map(input => [input.txId, input.vOut, input.sequence])).toEqual([
      [inputs[0].txid, 0, 0xffffffff],
      [inputs[1].txid, 3, 0xffffffff]
    ])
  })

  it('refuses a recipient address from another network', () => {
    expect(() => buildCoreTransfer(inputs, 'XanAvE5GMB8CsPH78B9moJq9viEVKvCS4f', 10_000n, CHANGE, 0n, 'testnet'))
      .toThrow(/not a valid testnet address/)
  })
})
