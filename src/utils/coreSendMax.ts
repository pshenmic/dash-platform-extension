import { CORE_FEE_PER_BYTE, CORE_P2PKH_OUTPUT_BYTES } from '../constants'

// Fee in duffs of the outputs a Core payment adds beyond the first.
export const extraCoreOutputsFee = (outputs: number): bigint =>
  BigInt(Math.max(outputs - 1, 0) * CORE_P2PKH_OUTPUT_BYTES) * CORE_FEE_PER_BYTE

// Largest Core amount `outputs` outputs can pay, from the one-output maximum of a send-max estimate.
export const coreMaxForOutputs = (maxForOneOutput: bigint, outputs: number): bigint => {
  const max = maxForOneOutput - extraCoreOutputsFee(outputs)
  return max > 0n ? max : 0n
}
