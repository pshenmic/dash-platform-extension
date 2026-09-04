import { filterRecoveredNotesByAddress } from '../../src/utils'

// Stand-in for RecoveredNoteWASM: only note.address.toBech32m() is read.
const recoveredNote = (address: string): any => ({
  note: { address: { toBech32m: () => address } }
})

const ADDR_A = 'orchardAddressA'
const ADDR_B = 'orchardAddressB'
const ADDR_C = 'orchardAddressC'

describe('filterRecoveredNotesByAddress', () => {
  const notes = [recoveredNote(ADDR_A), recoveredNote(ADDR_B), recoveredNote(ADDR_A), recoveredNote(ADDR_C)]

  const addressesOf = (result: any[]): string[] => result.map((note) => note.note.address.toBech32m())

  it('keeps only notes received on one of the requested addresses', () => {
    const result = filterRecoveredNotesByAddress(notes, [ADDR_A], 'testnet')

    expect(result).toHaveLength(2)
    expect(addressesOf(result)).toEqual([ADDR_A, ADDR_A])
  })

  it('supports multiple source addresses', () => {
    const result = filterRecoveredNotesByAddress(notes, [ADDR_A, ADDR_C], 'testnet')

    expect(addressesOf(result)).toEqual([ADDR_A, ADDR_A, ADDR_C])
  })

  it('returns an empty array when no note matches', () => {
    expect(filterRecoveredNotesByAddress(notes, ['orchardUnknown'], 'testnet')).toEqual([])
  })

  it('returns an empty array for an empty address list', () => {
    expect(filterRecoveredNotesByAddress(notes, [], 'testnet')).toEqual([])
  })
})
