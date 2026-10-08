import type { CoinControlSelection, CoreUtxo, ShieldedNote } from '../ui/states/sendTransaction/types'

export interface CoinControlSummary {
  count: number
  total: bigint
}

// Number of picked inputs and their total in base units: UTXOs and notes still present, platform input amounts.
export const summarizeCoinControl = (selection: CoinControlSelection, utxos: CoreUtxo[], notes: ShieldedNote[]): CoinControlSummary => {
  if (selection.type === 'utxo') {
    const picked = utxos.filter(utxo => selection.inputs.some(ref => ref.txid === utxo.txid && ref.vout === utxo.vout))
    return { count: picked.length, total: picked.reduce((sum, utxo) => sum + BigInt(utxo.amount), 0n) }
  }
  if (selection.type === 'platformInputs') {
    return { count: selection.inputs.length, total: selection.inputs.reduce((sum, input) => sum + BigInt(input.amount), 0n) }
  }
  if (selection.type === 'shieldedNotes') {
    const picked = notes.filter(note => selection.noteIds.includes(note.noteId))
    return { count: picked.length, total: picked.reduce((sum, note) => sum + BigInt(note.amount), 0n) }
  }
  return { count: 0, total: 0n }
}
