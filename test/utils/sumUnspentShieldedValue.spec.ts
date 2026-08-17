import { sumUnspentShieldedValue, recoveredNoteNullifier } from '../../src/utils'

const ADDR_1 = 'orchardAddress1'
const ADDR_2 = 'orchardAddress2'

// Minimal stand-in for RecoveredNoteWASM: the function reads note.value,
// note.address.toBech32m() and the raw NAPI own nullifier. `leafNullifier`
// mimics the unrelated action-leaf nullifier the buggy version used, to prove it
// is now ignored.
const recoveredNote = (value: bigint, ownNullifier: number[], address: string = ADDR_1, leafNullifier: number[] = [0xff]): any => ({
  index: 0,
  note: { value, address: { toBech32m: () => address } },
  nullifier: Uint8Array.from(leafNullifier), // action-leaf field — must NOT be used
  _rawRecoveredNote: { nullifier: Uint8Array.from(ownNullifier) }
})

const status = (nullifier: number[], isSpent: boolean): any => ({
  nullifier: Uint8Array.from(nullifier),
  isSpent
})

describe('recoveredNoteNullifier', () => {
  test('reads the note\'s own nullifier from the raw NAPI, not the leaf field', () => {
    const note = recoveredNote(5n, [1, 2, 3], ADDR_1, [9, 9, 9])

    expect([...recoveredNoteNullifier(note)]).toEqual([1, 2, 3])
  })
})

describe('sumUnspentShieldedValue', () => {
  test('returns a zero balance and empty breakdown for no notes', () => {
    const result = sumUnspentShieldedValue([], [], 'testnet')

    expect(result).toEqual({ balance: 0n, spendableNotes: 0, byAddress: [] })
  })

  test('counts every note as spendable when none of their own nullifiers are spent', () => {
    const result = sumUnspentShieldedValue(
      [recoveredNote(10n, [1, 1, 1]), recoveredNote(7n, [2, 2, 2])],
      [status([1, 1, 1], false), status([2, 2, 2], false)],
      'testnet'
    )

    expect(result.balance).toBe(17n)
    expect(result.spendableNotes).toBe(2)
  })

  test('groups unspent notes by receiving address and the aggregate equals the bucket sum', () => {
    const recovered = [
      recoveredNote(100n, [1], ADDR_1),
      recoveredNote(50n, [2], ADDR_1),
      recoveredNote(30n, [3], ADDR_2)
    ]

    const { balance, spendableNotes, byAddress } = sumUnspentShieldedValue(recovered, [], 'testnet')

    expect(balance).toBe(180n)
    expect(spendableNotes).toBe(3)

    const byAddr = Object.fromEntries(byAddress.map((entry) => [entry.address, entry]))
    expect(byAddr[ADDR_1]).toEqual({ address: ADDR_1, diversifierIndex: null, balance: 150n, spendableNotes: 2 })
    expect(byAddr[ADDR_2]).toEqual({ address: ADDR_2, diversifierIndex: null, balance: 30n, spendableNotes: 1 })
    expect(byAddress.reduce((sum, entry) => sum + entry.balance, 0n)).toBe(balance)
  })

  test('excludes a note whose own nullifier is spent from both the aggregate and its bucket', () => {
    const recovered = [
      recoveredNote(100n, [1], ADDR_1),
      recoveredNote(50n, [2], ADDR_1)
    ]

    const { balance, spendableNotes, byAddress } = sumUnspentShieldedValue(recovered, [status([2], true)], 'testnet')

    expect(balance).toBe(100n)
    expect(spendableNotes).toBe(1)
    expect(byAddress).toEqual([{ address: ADDR_1, diversifierIndex: null, balance: 100n, spendableNotes: 1 }])
  })

  test('ignores the action-leaf nullifier: a note stays spendable when only its leaf nullifier is reported spent', () => {
    // Leaf nullifier [9,9,9] is spent on-chain, but that belongs to the note this
    // action spent — our own note ([3,3,3]) is unspent and must still count.
    const note = recoveredNote(4n, [3, 3, 3], ADDR_1, [9, 9, 9])

    const result = sumUnspentShieldedValue([note], [status([9, 9, 9], true)], 'testnet')

    expect(result.balance).toBe(4n)
    expect(result.spendableNotes).toBe(1)
  })

  test('matches spent status by nullifier hex regardless of response order', () => {
    const first = recoveredNote(10n, [0xaa, 0xbb], ADDR_1)
    const second = recoveredNote(5n, [0xcc, 0xdd], ADDR_1)

    // Statuses returned in reverse order relative to the notes.
    const statuses = [
      status([0xcc, 0xdd], true),
      status([0xaa, 0xbb], false)
    ]

    const result = sumUnspentShieldedValue([first, second], statuses, 'testnet')

    expect(result.balance).toBe(10n)
    expect(result.spendableNotes).toBe(1)
  })

  test('attaches the derivation index when the address is known, null otherwise', () => {
    const recovered = [
      recoveredNote(100n, [1], ADDR_1),
      recoveredNote(30n, [2], ADDR_2)
    ]
    const diversifierIndexByAddress = new Map([[ADDR_1, 3]])

    const { byAddress } = sumUnspentShieldedValue(recovered, [], 'testnet', diversifierIndexByAddress)

    const byAddr = Object.fromEntries(byAddress.map((entry) => [entry.address, entry.diversifierIndex]))
    expect(byAddr[ADDR_1]).toBe(3)
    expect(byAddr[ADDR_2]).toBeNull()
  })
})
