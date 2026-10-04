import { computeShieldedSpendFee, maxShieldedSpend, selectShieldedNotes } from '../../src/utils'

// Minimal RecoveredNoteWASM shape: selection only reads note.value.
const note = (value: bigint): any => ({ note: { value } })
const values = (notes: any[]): bigint[] => notes.map(recoveredNote => recoveredNote.note.value)

const M = 1_000_000n

// Platform's own formula at 2, 3, 4 and 5 actions.
const TRANSFER_FEE_2 = 162_851_200n
const TRANSFER_FEE_3 = 194_276_800n
const TRANSFER_FEE_4 = 225_702_400n
const TRANSFER_FEE_5 = 257_128_000n

describe('computeShieldedSpendFee', () => {
  it('matches Platform\'s minimum fee for a transfer', () => {
    expect(computeShieldedSpendFee('transfer', 2)).toBe(TRANSFER_FEE_2)
    expect(computeShieldedSpendFee('transfer', 3)).toBe(TRANSFER_FEE_3)
    expect(computeShieldedSpendFee('transfer', 5)).toBe(TRANSFER_FEE_5)
  })

  it('pads to two actions, as Orchard does', () => {
    expect(computeShieldedSpendFee('transfer', 0)).toBe(TRANSFER_FEE_2)
    expect(computeShieldedSpendFee('transfer', 1)).toBe(TRANSFER_FEE_2)
  })

  it('adds the address write for an unshield', () => {
    expect(computeShieldedSpendFee('unshield', 2)).toBe(TRANSFER_FEE_2 + 6_082_800n)
  })

  it('adds the withdrawal document for a withdrawal', () => {
    expect(computeShieldedSpendFee('withdrawal', 2)).toBe(TRANSFER_FEE_2 + 112_340_000n)
  })
})

describe('selectShieldedNotes', () => {
  it('takes the largest note alone when it covers the amount and fee', () => {
    const selection = selectShieldedNotes([note(300n * M), note(500n * M)], 100n * M, 'transfer')

    expect(values(selection.notes)).toEqual([500n * M])
    expect(selection.feeCredits).toBe(TRANSFER_FEE_2)
  })

  it('charges the fee of every added note, taking one more note than a flat fee would', () => {
    // Three notes cover 120M plus the two-note fee, but not the three-note fee.
    const selection = selectShieldedNotes([note(100n * M), note(100n * M), note(100n * M), note(100n * M)], 120n * M, 'transfer')

    expect(selection.notes).toHaveLength(4)
    expect(selection.feeCredits).toBe(TRANSFER_FEE_4)
  })

  it('reserves the larger unshield fee', () => {
    const notes = [note(165n * M)]

    expect(selectShieldedNotes(notes, 1n * M, 'transfer').notes).toHaveLength(1)
    expect(() => selectShieldedNotes(notes, 1n * M, 'unshield')).toThrow(/Insufficient shielded balance/)
  })

  it('throws when all the notes cannot cover the amount and fee', () => {
    expect(() => selectShieldedNotes([note(200n * M)], 100n * M, 'transfer')).toThrow(/Insufficient shielded balance/)
  })

  it('throws when the spend needs more notes than one transaction allows', () => {
    const notes = Array.from({ length: 6 }, () => note(100n * M))

    expect(() => selectShieldedNotes(notes, 300n * M, 'transfer')).toThrow(/6 notes, over the 5-note limit/)
  })
})

describe('maxShieldedSpend', () => {
  it('sends nothing from an empty pool', () => {
    expect(maxShieldedSpend([], 'transfer')).toEqual({ amountCredits: 0n, feeCredits: TRANSFER_FEE_2, notesCount: 0 })
  })

  it('sends nothing when no note covers its own fee', () => {
    expect(maxShieldedSpend([note(100n * M)], 'transfer').amountCredits).toBe(0n)
  })

  it('stops adding notes once their value no longer pays for the fee they add', () => {
    // The third note is worth 10M but raises the fee by ~31M.
    const max = maxShieldedSpend([note(300n * M), note(10n * M), note(10n * M)], 'transfer')

    expect(max).toEqual({ amountCredits: 310n * M - TRANSFER_FEE_2, feeCredits: TRANSFER_FEE_2, notesCount: 2 })
  })

  it('never uses more notes than one transaction allows', () => {
    const notes = Array.from({ length: 8 }, () => note(1000n * M))

    expect(maxShieldedSpend(notes, 'transfer').notesCount).toBe(5)
  })

  it('returns an amount a spend accepts, and not a credit more', () => {
    const notes = [note(500n * M), note(80n * M), note(60n * M)]

    for (const kind of ['transfer', 'unshield', 'withdrawal'] as const) {
      const max = maxShieldedSpend(notes, kind)

      expect(selectShieldedNotes(notes, max.amountCredits, kind).feeCredits).toBe(max.feeCredits)
      expect(() => selectShieldedNotes(notes, max.amountCredits + 1n, kind)).toThrow()
    }
  })
})
