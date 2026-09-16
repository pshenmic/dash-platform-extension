import type { RecoveredNoteWASM } from 'pshenmic-dpp'
import { ShieldedSpendKind } from '../types/ShieldedSpendKind'
import {
  SHIELDED_MAX_SPEND_NOTES,
  SHIELDED_MIN_ACTIONS,
  SHIELDED_PER_ACTION_PROCESSING_FEE_CREDITS,
  SHIELDED_PROOF_VERIFICATION_FEE_CREDITS,
  SHIELDED_STORAGE_BYTES_PER_ACTION,
  SHIELDED_STORAGE_CREDITS_PER_BYTE,
  SHIELDED_UNSHIELD_ADDRESS_STORAGE_BYTES,
  SHIELDED_WITHDRAWAL_DOCUMENT_STORAGE_BYTES
} from '../constants'

export const SHIELDED_SPEND_KINDS: ShieldedSpendKind[] = ['transfer', 'unshield', 'withdrawal']

export interface ShieldedNoteSelection {
  notes: RecoveredNoteWASM[]
  feeCredits: bigint
}

export interface ShieldedSpendEstimate {
  amountCredits: bigint
  feeCredits: bigint
  notesCount: number
}

// The fee consensus charges a spend of `notesCount` notes, mirroring Platform's
// compute_minimum_shielded_fee and its unshield / withdrawal variants. The builder
// charges the same amount, so notes reserved against it fund the spend exactly.
export const computeShieldedSpendFee = (kind: ShieldedSpendKind, notesCount: number): bigint => {
  // One action per spent note, padded to Orchard's minimum.
  const actions = BigInt(Math.max(notesCount, SHIELDED_MIN_ACTIONS))
  const perActionFee = SHIELDED_PER_ACTION_PROCESSING_FEE_CREDITS + SHIELDED_STORAGE_BYTES_PER_ACTION * SHIELDED_STORAGE_CREDITS_PER_BYTE
  const baseFee = SHIELDED_PROOF_VERIFICATION_FEE_CREDITS + actions * perActionFee

  if (kind === 'unshield') {
    return baseFee + SHIELDED_UNSHIELD_ADDRESS_STORAGE_BYTES * SHIELDED_STORAGE_CREDITS_PER_BYTE
  }
  if (kind === 'withdrawal') {
    return baseFee + SHIELDED_WITHDRAWAL_DOCUMENT_STORAGE_BYTES * SHIELDED_STORAGE_CREDITS_PER_BYTE
  }

  return baseFee
}

const sortByValueDesc = (notes: RecoveredNoteWASM[]): RecoveredNoteWASM[] => {
  return [...notes].sort((a, b) => (a.note.value < b.note.value ? 1 : -1))
}

// Selects the fewest notes (largest first) that cover `amountCredits` plus the fee
// for spending that many notes. Each added note raises the fee, so it is recomputed
// for every candidate set. Minimizing the note count keeps the Orchard bundle under
// Platform's state-transition size limit. Throws if the notes cannot cover the
// amount, or if even the minimal set exceeds the per-spend note cap.
export const selectShieldedNotes = (spendable: RecoveredNoteWASM[], amountCredits: bigint, kind: ShieldedSpendKind): ShieldedNoteSelection => {
  const sorted = sortByValueDesc(spendable)

  let total = 0n
  for (let count = 1; count <= sorted.length; count++) {
    total += sorted[count - 1].note.value
    const feeCredits = computeShieldedSpendFee(kind, count)

    if (total >= amountCredits + feeCredits) {
      if (count > SHIELDED_MAX_SPEND_NOTES) {
        throw new Error(`This spend requires ${count} notes, over the ${SHIELDED_MAX_SPEND_NOTES}-note limit per shielded transaction — consolidate notes first`)
      }

      return { notes: sorted.slice(0, count), feeCredits }
    }
  }

  throw new Error('Insufficient shielded balance for this amount plus fee')
}

// The largest amount a single spend can send: across every note count up to the
// cap, the value of the largest notes minus the fee for spending them. Zero, with
// no notes, when no set of notes covers its own fee.
export const maxShieldedSpend = (spendable: RecoveredNoteWASM[], kind: ShieldedSpendKind): ShieldedSpendEstimate => {
  const sorted = sortByValueDesc(spendable)

  let best: ShieldedSpendEstimate = { amountCredits: 0n, feeCredits: computeShieldedSpendFee(kind, 0), notesCount: 0 }
  let total = 0n
  for (let count = 1; count <= Math.min(sorted.length, SHIELDED_MAX_SPEND_NOTES); count++) {
    total += sorted[count - 1].note.value
    const feeCredits = computeShieldedSpendFee(kind, count)
    const amountCredits = total - feeCredits

    if (amountCredits > best.amountCredits) {
      best = { amountCredits, feeCredits, notesCount: count }
    }
  }

  return best
}
