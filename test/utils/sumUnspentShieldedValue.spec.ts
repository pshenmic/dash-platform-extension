import { sumUnspentShieldedValue } from '../../src/utils'

// Minimal stand-ins for the WASM note shapes the function reads:
// recoveredNote.index, recoveredNote.note.value, recoveredNote.note.address.toBech32m().
const recoveredNote = (index: number, value: bigint, address: string): any => ({
  index,
  note: { value, address: { toBech32m: () => address } }
})

const leaf = (nullifier: number[]): any => ({ nullifier: Uint8Array.from(nullifier) })
const status = (nullifier: number[], isSpent: boolean): any => ({ nullifier: Uint8Array.from(nullifier), isSpent })

const ADDR_1 = 'orchardAddress1'
const ADDR_2 = 'orchardAddress2'

describe('sumUnspentShieldedValue', () => {
  it('returns a zero balance and empty breakdown for no notes', () => {
    const result = sumUnspentShieldedValue([], [], [], 'testnet')

    expect(result).toEqual({ balance: 0n, spendableNotes: 0, byAddress: [] })
  })

  it('groups unspent notes by receiving address and the aggregate equals the bucket sum', () => {
    const recovered = [
      recoveredNote(0, 100n, ADDR_1),
      recoveredNote(1, 50n, ADDR_1),
      recoveredNote(2, 30n, ADDR_2)
    ]
    const allNotes = [leaf([1]), leaf([2]), leaf([3])]

    const { balance, spendableNotes, byAddress } = sumUnspentShieldedValue(recovered, allNotes, [], 'testnet')

    expect(balance).toBe(180n)
    expect(spendableNotes).toBe(3)

    const byAddr = Object.fromEntries(byAddress.map((entry) => [entry.address, entry]))
    expect(byAddr[ADDR_1]).toEqual({ address: ADDR_1, diversifierIndex: null, balance: 150n, spendableNotes: 2 })
    expect(byAddr[ADDR_2]).toEqual({ address: ADDR_2, diversifierIndex: null, balance: 30n, spendableNotes: 1 })
    expect(byAddress.reduce((sum, entry) => sum + entry.balance, 0n)).toBe(balance)
  })

  it('excludes spent notes from both the aggregate and the per-address bucket', () => {
    const recovered = [
      recoveredNote(0, 100n, ADDR_1),
      recoveredNote(1, 50n, ADDR_1)
    ]
    const allNotes = [leaf([1]), leaf([2])]
    const statuses = [status([2], true)]

    const { balance, spendableNotes, byAddress } = sumUnspentShieldedValue(recovered, allNotes, statuses, 'testnet')

    expect(balance).toBe(100n)
    expect(spendableNotes).toBe(1)
    expect(byAddress).toEqual([{ address: ADDR_1, diversifierIndex: null, balance: 100n, spendableNotes: 1 }])
  })

  it('skips a recovered note whose leaf is missing from allNotes', () => {
    const recovered = [recoveredNote(5, 100n, ADDR_1)]

    const { balance, spendableNotes, byAddress } = sumUnspentShieldedValue(recovered, [], [], 'testnet')

    expect(balance).toBe(0n)
    expect(spendableNotes).toBe(0)
    expect(byAddress).toEqual([])
  })

  it('attaches the derivation index when the address is known, null otherwise', () => {
    const recovered = [
      recoveredNote(0, 100n, ADDR_1),
      recoveredNote(1, 30n, ADDR_2)
    ]
    const allNotes = [leaf([1]), leaf([2])]
    const diversifierIndexByAddress = new Map([[ADDR_1, 3]])

    const { byAddress } = sumUnspentShieldedValue(recovered, allNotes, [], 'testnet', diversifierIndexByAddress)

    const byAddr = Object.fromEntries(byAddress.map((entry) => [entry.address, entry.diversifierIndex]))
    expect(byAddr[ADDR_1]).toBe(3)
    expect(byAddr[ADDR_2]).toBeNull()
  })
})
