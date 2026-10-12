import { CORE_DUST_THRESHOLD, CORE_FEE_PER_BYTE, CORE_P2PKH_INPUT_BYTES, CORE_P2PKH_OUTPUT_BYTES, CORE_TX_OVERHEAD_BYTES } from '../constants'

// Same formula as `estimateCoreFee` in coreTransfer.ts, which is not imported: it pulls `./index` back in.
const estimateCoreFee = (inputCount: number, outputCount: number): bigint =>
  BigInt(CORE_TX_OVERHEAD_BYTES + inputCount * CORE_P2PKH_INPUT_BYTES + outputCount * CORE_P2PKH_OUTPUT_BYTES) * CORE_FEE_PER_BYTE

const spendable = (utxoAmounts: bigint[]): bigint[] => utxoAmounts.filter(amount => amount > 0n)

// Fee in duffs of a Core send to `recipients` outputs, inputs picked largest-first like `selectCoreUtxos`; null when the UTXOs do not cover the amount.
export const estimateCoreSendFee = (utxoAmounts: bigint[], amountDuffs: bigint, recipients: number): bigint | null => {
  const sorted = spendable(utxoAmounts).sort((a, b) => a === b ? 0 : a > b ? -1 : 1)
  let inputs = 0
  let totalIn = 0n

  for (const amount of sorted) {
    inputs++
    totalIn += amount

    if (totalIn < amountDuffs + estimateCoreFee(inputs, recipients)) continue

    const feeWithChange = estimateCoreFee(inputs, recipients + 1)
    return totalIn - amountDuffs - feeWithChange > CORE_DUST_THRESHOLD ? feeWithChange : totalIn - amountDuffs
  }

  return null
}

// Largest amount a Core send can pay `recipients` outputs: every UTXO spent, no change.
export const maxCoreSendAmount = (utxoAmounts: bigint[], recipients: number): bigint => {
  const amounts = spendable(utxoAmounts)
  const max = amounts.reduce((sum, amount) => sum + amount, 0n) - estimateCoreFee(amounts.length, recipients)
  return max > 0n ? max : 0n
}
