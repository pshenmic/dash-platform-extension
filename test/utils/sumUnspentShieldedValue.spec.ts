import { sumUnspentShieldedValue, recoveredNoteNullifier } from '../../src/utils'

// Minimal stand-in for RecoveredNoteWASM: the code reads `note.value` and the
// raw NAPI nullifier. `leafNullifier` mimics the unrelated action-leaf nullifier
// that the buggy version used, to prove it is now ignored.
const recoveredNote = (value: bigint, ownNullifier: number[], leafNullifier: number[] = [0xff]): any => ({
  index: 0,
  note: { value },
  nullifier: Uint8Array.from(leafNullifier), // action-leaf field — must NOT be used
  _rawRecoveredNote: { nullifier: Uint8Array.from(ownNullifier) }
})

const status = (nullifier: number[], isSpent: boolean): any => ({
  nullifier: Uint8Array.from(nullifier),
  isSpent
})

describe('recoveredNoteNullifier', () => {
  test('reads the note\'s own nullifier from the raw NAPI, not the leaf field', () => {
    const note = recoveredNote(5n, [1, 2, 3], [9, 9, 9])

    expect([...recoveredNoteNullifier(note)]).toEqual([1, 2, 3])
  })
})

describe('sumUnspentShieldedValue', () => {
  test('excludes a note whose own nullifier is spent and sums the rest', () => {
    const spentNote = recoveredNote(10n, [1, 1, 1])
    const liveNote = recoveredNote(7n, [2, 2, 2])

    const statuses = [
      status([1, 1, 1], true),
      status([2, 2, 2], false)
    ]

    const result = sumUnspentShieldedValue([spentNote, liveNote], statuses)

    expect(result.balance).toBe(7n)
    expect(result.spendableNotes).toBe(1)
  })

  test('counts every note as spendable when none of their own nullifiers are spent', () => {
    const result = sumUnspentShieldedValue(
      [recoveredNote(10n, [1, 1, 1]), recoveredNote(7n, [2, 2, 2])],
      [status([1, 1, 1], false), status([2, 2, 2], false)]
    )

    expect(result.balance).toBe(17n)
    expect(result.spendableNotes).toBe(2)
  })

  test('ignores the action-leaf nullifier: a note stays spendable when only its leaf nullifier is reported spent', () => {
    // Leaf nullifier [9,9,9] is spent on-chain, but that belongs to the note this
    // action spent — our own note ([3,3,3]) is unspent and must still count.
    const note = recoveredNote(4n, [3, 3, 3], [9, 9, 9])

    const result = sumUnspentShieldedValue([note], [status([9, 9, 9], true)])

    expect(result.balance).toBe(4n)
    expect(result.spendableNotes).toBe(1)
  })

  test('matches spent status by nullifier hex regardless of response order', () => {
    const first = recoveredNote(10n, [0xaa, 0xbb])
    const second = recoveredNote(5n, [0xcc, 0xdd])

    // Statuses returned in reverse order relative to the notes.
    const statuses = [
      status([0xcc, 0xdd], true),
      status([0xaa, 0xbb], false)
    ]

    const result = sumUnspentShieldedValue([first, second], statuses)

    expect(result.balance).toBe(10n)
    expect(result.spendableNotes).toBe(1)
  })
})
