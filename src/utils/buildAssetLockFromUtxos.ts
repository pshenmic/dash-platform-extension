import { ExtraPayload, Input, Output, PrivateKey, Script, Transaction, TransactionType } from 'dash-core-sdk'
import { CoreUtxo } from '../types/CoreUtxo'

// Conservative P2PKH input size: outpoint, compact length, 108-byte script, sequence.
const SIGNED_INPUT_SIZE = 149
const DUST_DUFFS = 546n
export const CORE_ASSET_LOCK_FEE_PER_BYTE = 1n

export interface CoreAssetLockPlan {
  inputs: CoreUtxo[]
  amountDuffs: string
  feeDuffs: string
  changeDuffs: string
  changeAddress: string
  creditOutputAddress: string
}

const transaction = (plan: CoreAssetLockPlan): Transaction => {
  const amount = BigInt(plan.amountDuffs)
  const outputs = [new Output(amount, Script.fromASM('OP_RETURN OP_0'))]
  if (BigInt(plan.changeDuffs) > 0n) outputs.push(Output.createP2PKH(BigInt(plan.changeDuffs), plan.changeAddress))
  return new Transaction(
    plan.inputs.map(input => new Input(input.txid, input.vout, Output.createP2PKH(0n, input.address).script, 0xffffffff)),
    outputs, 0, undefined, TransactionType.TRANSACTION_ASSET_LOCK,
    new ExtraPayload.AssetLockTx(1, 1, [Output.createP2PKH(amount, plan.creditOutputAddress)])
  )
}

const estimateFee = (plan: CoreAssetLockPlan, rate: bigint): bigint => {
  const tx = transaction(plan)
  // Replace each unsigned script with the largest signed P2PKH input. The
  // serialized tx already accounts for compact counts and the special payload.
  const size = tx.bytes().length + tx.inputs.reduce((sum, input) => sum + SIGNED_INPUT_SIZE - input.bytes().length, 0)
  return BigInt(size) * rate
}

export const selectAssetLockUtxos = (
  utxos: CoreUtxo[], amountDuffs: bigint, creditOutputAddress: string, changeAddress: string,
  reserved: Set<string> = new Set(), feePerByte: bigint = CORE_ASSET_LOCK_FEE_PER_BYTE
): CoreAssetLockPlan => {
  if (amountDuffs <= 0n || amountDuffs > 21000000n * 100000000n) throw new Error('Invalid asset lock amount')
  if (feePerByte <= 0n) throw new Error('Invalid Core fee rate')
  const seen = new Set<string>()
  const available = utxos.filter(input => {
    const outpoint = `${input.txid}:${input.vout}`
    if (!/^[a-fA-F0-9]{64}$/.test(input.txid) || !Number.isSafeInteger(input.vout) || input.vout < 0 || input.vout > 0xffffffff || !/^\d+$/.test(input.amount) || BigInt(input.amount) <= 0n) {
      throw new Error('Invalid Core UTXO')
    }
    if (seen.has(outpoint)) throw new Error('Duplicate Core outpoint')
    seen.add(outpoint)
    return !reserved.has(outpoint)
  }).sort((a, b) => BigInt(a.amount) === BigInt(b.amount)
    ? `${a.txid}:${a.vout}`.localeCompare(`${b.txid}:${b.vout}`)
    : BigInt(a.amount) > BigInt(b.amount) ? -1 : 1)
  const plan: CoreAssetLockPlan = { inputs: [], amountDuffs: amountDuffs.toString(), feeDuffs: '0', changeDuffs: '0', creditOutputAddress, changeAddress }
  let total = 0n
  for (const input of available) {
    plan.inputs.push(input)
    total += BigInt(input.amount)
    plan.changeDuffs = '0'
    const withoutChange = estimateFee(plan, feePerByte)
    if (total < amountDuffs + withoutChange) continue
    plan.changeDuffs = DUST_DUFFS.toString()
    const withChange = estimateFee(plan, feePerByte)
    const change = total - amountDuffs - withChange
    plan.changeDuffs = change >= DUST_DUFFS ? change.toString() : '0'
    plan.feeDuffs = (total - amountDuffs - BigInt(plan.changeDuffs)).toString()
    return plan
  }
  throw new Error('Insufficient spendable Core balance for this amount plus fee')
}

export const buildAssetLockFromUtxos = (plan: CoreAssetLockPlan, keys: PrivateKey[]): Transaction => {
  if (keys.length !== plan.inputs.length || keys.length === 0) throw new Error('One Core key is required per input')
  plan.inputs.forEach((input, index) => {
    if (keys[index].getAddress() !== input.address) throw new Error('Core input does not belong to its derived key')
  })
  const total = plan.inputs.reduce((sum, input) => sum + BigInt(input.amount), 0n)
  if (total !== BigInt(plan.amountDuffs) + BigInt(plan.changeDuffs) + BigInt(plan.feeDuffs)) throw new Error('Core transaction amounts do not balance')
  const tx = transaction(plan)
  tx.sign(keys)
  return tx
}
