import { Input, Output, Script, Transaction } from 'dash-core-sdk'
import { CoreWalletUtxo } from '../content-script/services/CoreExplorerService'
import { NetworkType } from '../types/NetworkType'
import {
  CORE_DUST_THRESHOLD,
  CORE_FEE_PER_BYTE,
  CORE_P2PKH_INPUT_BYTES,
  CORE_P2PKH_OUTPUT_BYTES,
  CORE_TX_OVERHEAD_BYTES
} from '../constants'
import { coreAddressToScript } from './index'

// Coin selection and transaction assembly for a Core (L1) send. The L1
// counterpart of `platformTransfer.ts`: pure functions the handler composes,
// with no network access of their own.
//
// dash-core-sdk's own `Transaction.generateChange` is not used — it derives the
// fee from a formula that mixes duffs with byte counts and clamps a dust change
// back up to MIN_FEE_RELAY, which can push the outputs above the inputs.

// nSequence marking an input final: this wallet never builds a replaceable or
// timelocked transaction.
const CORE_INPUT_SEQUENCE = 0xffffffff

export interface CoreUtxoSelection {
  inputs: CoreWalletUtxo[]
  totalIn: bigint
  fee: bigint
  // 0 when the leftover was too small to pay for its own output and went to the
  // fee instead, in which case the transaction carries no change output.
  change: bigint
}

// Size of a signed P2PKH transaction with this shape, in bytes. An upper bound:
// signature lengths vary, and a real transaction comes out at or under it.
export const estimateCoreTxSize = (inputCount: number, outputCount: number): number => {
  return CORE_TX_OVERHEAD_BYTES + (inputCount * CORE_P2PKH_INPUT_BYTES) + (outputCount * CORE_P2PKH_OUTPUT_BYTES)
}

// The size alone prices the fee: CORE_FEE_PER_BYTE is Dash's relay rate, so there
// is no absolute minimum to floor the result at.
export const estimateCoreFee = (inputCount: number, outputCount: number): bigint => {
  return BigInt(estimateCoreTxSize(inputCount, outputCount)) * CORE_FEE_PER_BYTE
}

/**
 * Picks the UTXOs to spend, largest first, until they cover the amount plus the
 * fee for the transaction they themselves make. Each added input grows the fee,
 * so the target is recomputed on every step.
 *
 * Largest-first keeps the input count — and with it the fee and the signing
 * work — as low as possible, at the cost of not consolidating dust.
 */
export const selectCoreUtxos = (candidates: CoreWalletUtxo[], amountDuffs: bigint): CoreUtxoSelection => {
  if (amountDuffs <= CORE_DUST_THRESHOLD) {
    throw new Error(`Minimum Core transfer is ${(CORE_DUST_THRESHOLD + 1n).toString()} duffs`)
  }

  const spendable = candidates.filter(utxo => utxo.amount > 0n)
  const sorted = [...spendable].sort((a, b) => {
    if (a.amount === b.amount) {
      return 0
    }

    return a.amount > b.amount ? -1 : 1
  })

  const inputs: CoreWalletUtxo[] = []
  let totalIn = 0n

  for (const utxo of sorted) {
    inputs.push(utxo)
    totalIn += utxo.amount

    // The cheapest form this transaction can take is the one without a change
    // output, so that is what decides whether the inputs are enough. Gating on
    // the with-change fee instead would refuse the last 34 duffs' worth of
    // transactions — exactly the case of draining an address.
    const feeWithoutChange = estimateCoreFee(inputs.length, 1)

    if (totalIn < amountDuffs + feeWithoutChange) {
      continue
    }

    const feeWithChange = estimateCoreFee(inputs.length, 2)
    const change = totalIn - amountDuffs - feeWithChange

    if (change > CORE_DUST_THRESHOLD) {
      return { inputs: [...inputs], totalIn, fee: feeWithChange, change }
    }

    // The change would be dust, or would not fit at all — an output nobody would
    // relay. Drop it and let the leftover go to the miner, which is what every
    // Core wallet does here.
    return { inputs: [...inputs], totalIn, fee: totalIn - amountDuffs, change: 0n }
  }

  const available = sorted.reduce((sum, utxo) => sum + utxo.amount, 0n)

  throw new Error(
    `Insufficient funds: ${available.toString()} duffs available across ${sorted.length} ` +
    `unspent output${sorted.length === 1 ? '' : 's'}, need ${amountDuffs.toString()} duffs plus fee`
  )
}

/**
 * Assembles the unsigned transfer: one output paying the recipient, an optional
 * change output, and one input per selected UTXO carrying the locking script of
 * the address it pays to (what `Transaction.sign` needs to produce a sighash).
 *
 * The recipient script is decoded from its address, so a P2SH recipient gets a
 * P2SH script rather than being mis-encoded as P2PKH. Change is always ours and
 * always P2PKH.
 */
export const buildCoreTransfer = (
  inputs: CoreWalletUtxo[],
  toAddress: string,
  amountDuffs: bigint,
  changeAddress: string,
  changeDuffs: bigint,
  network: NetworkType
): Transaction => {
  const recipientScript = Script.fromBytes(coreAddressToScript(toAddress, network).bytes())
  const outputs = [new Output(amountDuffs, recipientScript)]

  if (changeDuffs > 0n) {
    outputs.push(Output.createP2PKH(changeDuffs, changeAddress))
  }

  const transaction = new Transaction([], outputs)

  for (const utxo of inputs) {
    const lockingScript = Output.createP2PKH(0n, utxo.address).script

    transaction.addInput(new Input(utxo.txid, utxo.vout, lockingScript, CORE_INPUT_SEQUENCE))
  }

  return transaction
}
