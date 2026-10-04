import { ESTIMATED_FEES } from '../../../constants'
import { SHIELDED_SPEND_FEE_CREDITS, TRANSFER_FEE_CREDITS } from '../../../../constants'
import type {
  CoreUtxo,
  ShieldedNote,
  TransferOperation,
  TransferOperationType,
  AddressAmount,
  TransferStageStatus,
  UtxoRef
} from '../types'

// Dev toggles: fail an operation at the given stage, reject the given password.
export const transferMockSettings: { failAtStage: number | null, rejectedPassword: string } = {
  failAtStage: null,
  rejectedPassword: 'wrong'
}

const FEE_PER_BYTE_DUFFS = 1n
const INPUT_BYTES = 148n
const OUTPUT_BYTES = 34n
const TX_OVERHEAD_BYTES = 10n
const ASSET_LOCK_PAYLOAD_BYTES = 60n

const CORE_STAGE_DURATIONS_MS = [1500, 6000, 3000]

const HEX = '0123456789abcdef'
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

const randomString = (alphabet: string, length: number): string =>
  Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')

const randomHash = (): string => randomString(HEX, 64)

const delay = async (minMs: number, maxMs: number): Promise<void> =>
  await new Promise(resolve => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)))

const assertPassword = (password: string): void => {
  if (password === '' || password === transferMockSettings.rejectedPassword) {
    throw new Error('Invalid password')
  }
}

const HOUR_MS = 60 * 60 * 1000

const MOCK_UTXOS: CoreUtxo[] = [
  { amount: '250000000', confirmations: 1520 },
  { amount: '120000000', confirmations: 340 },
  { amount: '45000000', confirmations: 96 },
  { amount: '8000000', confirmations: 12 },
  { amount: '1500000', confirmations: 2 }
].map((utxo, index) => ({
  ...utxo,
  txid: randomHash(),
  vout: index % 2,
  address: `y${randomString(BASE58, 33)}`,
  timestamp: Date.now() - utxo.confirmations * 2.5 * 60 * 1000 - index * HOUR_MS
}))

const MOCK_NOTES: ShieldedNote[] = ['300000000000', '75000000000', '12500000000', '900000000'].map(amount => ({
  noteId: randomHash(),
  address: `tdash1${randomString(BECH32, 72)}`,
  amount
}))

const txFee = (inputs: number, outputs: number, isAssetLock: boolean): bigint => {
  const bytes = TX_OVERHEAD_BYTES + BigInt(inputs) * INPUT_BYTES + BigInt(outputs) * OUTPUT_BYTES + (isAssetLock ? ASSET_LOCK_PAYLOAD_BYTES : 0n)
  return bytes * FEE_PER_BYTE_DUFFS
}

const findUtxos = (refs: UtxoRef[]): CoreUtxo[] => refs.map(ref => {
  const utxo = MOCK_UTXOS.find(item => item.txid === ref.txid && item.vout === ref.vout)
  if (utxo == null) throw new Error(`Unknown input ${ref.txid}:${ref.vout}`)
  return utxo
})

const toRefs = (utxos: CoreUtxo[]): UtxoRef[] => utxos.map(({ txid, vout }) => ({ txid, vout }))

interface MockOperation {
  type: TransferOperationType
  startedAt: number
  durations: number[]
  failAtStage: number | null
  coreTxHash: string
  platformTxHash: string
  fee: string
}

const operations = new Map<string, MockOperation>()

const startOperation = (type: TransferOperationType, inputs?: UtxoRef[]): { operationId: string } => {
  const fee = txFee(inputs != null && inputs.length > 0 ? inputs.length : 1, 2, true)

  const operationId = randomHash()

  operations.set(operationId, {
    type,
    startedAt: Date.now(),
    durations: CORE_STAGE_DURATIONS_MS,
    failAtStage: transferMockSettings.failAtStage,
    coreTxHash: randomHash(),
    platformTxHash: randomHash(),
    fee: fee.toString()
  })

  return { operationId }
}

const activeStageIndex = (operation: MockOperation): number => {
  let elapsed = Date.now() - operation.startedAt
  let index = 0

  while (index < operation.durations.length && elapsed >= operation.durations[index]) {
    elapsed -= operation.durations[index]
    index++
  }

  return operation.failAtStage != null ? Math.min(index, operation.failAtStage) : index
}

const snapshotOperation = (operationId: string, operation: MockOperation): TransferOperation => {
  const current = activeStageIndex(operation)
  const failed = operation.failAtStage != null && current === operation.failAtStage

  const stages = operation.durations.map((_, index) => {
    let status: TransferStageStatus = 'pending'
    if (index < current) status = 'done'
    if (index === current) status = failed ? 'failed' : 'active'
    return { id: `stage-${index}`, status }
  })

  const isDone = current >= operation.durations.length

  return {
    operationId,
    type: operation.type,
    stages,
    coreTxHash: current > 0 ? operation.coreTxHash : undefined,
    platformTxHash: isDone ? operation.platformTxHash : undefined,
    fee: operation.fee,
    error: failed ? 'Mock failure: the Platform node rejected the transition' : undefined
  }
}

const getOperation = (operationId: string): MockOperation => {
  const operation = operations.get(operationId)
  if (operation == null) throw new Error(`Unknown operation ${operationId}`)
  return operation
}

// MOCK: 04-backend-gaps.md #1
export const listCoreUtxos = async (): Promise<CoreUtxo[]> => {
  await delay(300, 700)
  return MOCK_UTXOS.map(utxo => ({ ...utxo }))
}

// MOCK: 04-backend-gaps.md #2
export const estimateCoreFee = async (params: {
  outputs: AddressAmount[]
  inputs?: UtxoRef[]
  changeAddress?: string
  type?: 'transfer' | 'assetLock'
  sendMax?: boolean
}): Promise<{ fee: string, inputs: UtxoRef[] }> => {
  await delay(200, 500)

  const isAssetLock = params.type === 'assetLock'
  const outputs = Math.max(params.outputs.length, 1)

  if (params.sendMax === true) {
    const utxos = params.inputs != null && params.inputs.length > 0 ? findUtxos(params.inputs) : MOCK_UTXOS
    return { fee: txFee(utxos.length, outputs, isAssetLock).toString(), inputs: toRefs(utxos) }
  }

  if (params.inputs != null && params.inputs.length > 0) {
    return { fee: txFee(params.inputs.length, outputs + 1, isAssetLock).toString(), inputs: params.inputs }
  }

  return { fee: txFee(1, outputs + 1, isAssetLock).toString(), inputs: [] }
}

// MOCK: 04-backend-gaps.md #3
export const sendCoreTransaction = async (params: {
  outputs: AddressAmount[]
  inputs?: UtxoRef[]
  changeAddress?: string
}, password: string): Promise<{ txid: string, fee: string }> => {
  await delay(800, 1500)
  assertPassword(password)

  const { fee } = await estimateCoreFee(params)
  return { txid: randomHash(), fee }
}

// MOCK: 04-backend-gaps.md #4
export const topUpIdentityFromCore = async (identityId: string, amountDuffs: string, password: string, inputs?: UtxoRef[]): Promise<{ operationId: string }> => {
  await delay(500, 900)
  assertPassword(password)
  return startOperation('topUpFromCore', inputs)
}

// MOCK: 04-backend-gaps.md #5
export const fundPlatformAddressFromWallet = async (platformAddress: string, amountDuffs: string, password: string, inputs?: UtxoRef[]): Promise<{ operationId: string }> => {
  await delay(500, 900)
  assertPassword(password)
  return startOperation('fundAddressFromCore', inputs)
}

// MOCK: 04-backend-gaps.md #6
export const shieldFromCore = async (amountDuffs: string, password: string, toShieldedAddress?: string, inputs?: UtxoRef[]): Promise<{ operationId: string }> => {
  await delay(500, 900)
  assertPassword(password)
  return startOperation('shieldFromCore', inputs)
}

// MOCK: 04-backend-gaps.md #7
export const getTransferOperation = async (operationId: string): Promise<TransferOperation> => {
  await delay(100, 300)
  return snapshotOperation(operationId, getOperation(operationId))
}

// MOCK: 04-backend-gaps.md #7
export const listPendingTransferOperations = async (): Promise<TransferOperation[]> => {
  await delay(100, 300)
  return Array.from(operations.entries())
    .map(([operationId, operation]) => snapshotOperation(operationId, operation))
    .filter(operation => operation.stages.some(stage => stage.status === 'active' || stage.status === 'failed'))
}

// MOCK: 04-backend-gaps.md #7
export const retryTransferOperation = async (operationId: string, password: string): Promise<{ operationId: string }> => {
  await delay(300, 600)
  assertPassword(password)

  const operation = getOperation(operationId)
  const failedStage = operation.failAtStage ?? 0
  const completedMs = operation.durations.slice(0, failedStage).reduce((sum, ms) => sum + ms, 0)

  operation.failAtStage = null
  operation.startedAt = Date.now() - completedMs

  return { operationId }
}

// MOCK: 04-backend-gaps.md #8
export const sendPlatformTransfer = async (params: {
  inputs: AddressAmount[]
  outputs: AddressAmount[]
}, password: string): Promise<{ stHash: string, feeCredits: string }> => {
  await delay(800, 1500)
  assertPassword(password)
  return { stHash: randomHash(), feeCredits: TRANSFER_FEE_CREDITS.toString() }
}

// MOCK: 04-backend-gaps.md #8
export const withdrawPlatformAddressToCore = async (params: {
  inputs: AddressAmount[]
  toCoreAddress: string
}, password: string): Promise<{ stHash: string, feeCredits: string }> => {
  await delay(800, 1500)
  assertPassword(password)
  return { stHash: randomHash(), feeCredits: TRANSFER_FEE_CREDITS.toString() }
}

// MOCK: 04-backend-gaps.md #9
export const listShieldedNotes = async (password: string): Promise<ShieldedNote[]> => {
  await delay(400, 900)
  assertPassword(password)
  return MOCK_NOTES.map(note => ({ ...note }))
}

// MOCK: 04-backend-gaps.md #9
export const sendShieldedTransfer = async (toShieldedAddress: string, amountCredits: string, password: string, account?: number, memo?: string, noteIds?: string[]): Promise<{ stHash: string, feeCredits: string }> => {
  await delay(1500, 3000)
  assertPassword(password)
  return { stHash: randomHash(), feeCredits: SHIELDED_SPEND_FEE_CREDITS.toString() }
}

// MOCK: 04-backend-gaps.md #9
export const unshieldToAddress = async (toPlatformAddress: string, amountCredits: string, password: string, account?: number, memo?: string, noteIds?: string[]): Promise<{ stHash: string, feeCredits: string }> => {
  await delay(1500, 3000)
  assertPassword(password)
  return { stHash: randomHash(), feeCredits: SHIELDED_SPEND_FEE_CREDITS.toString() }
}

// MOCK: 04-backend-gaps.md #9
export const withdrawShieldedToCore = async (toCoreAddress: string, amountCredits: string, password: string, account?: number, memo?: string, noteIds?: string[]): Promise<{ stHash: string, feeCredits: string }> => {
  await delay(1500, 3000)
  assertPassword(password)
  return { stHash: randomHash(), feeCredits: SHIELDED_SPEND_FEE_CREDITS.toString() }
}

// MOCK: 04-backend-gaps.md #12
export const estimateWithdrawalFee = async (params: {
  from: 'identity' | 'platformAddress' | 'shielded'
  amountCredits: string
}): Promise<{ feeCredits: string }> => {
  await delay(200, 400)

  const feeCredits = {
    identity: ESTIMATED_FEES.testnet.credits,
    platformAddress: TRANSFER_FEE_CREDITS,
    shielded: SHIELDED_SPEND_FEE_CREDITS
  }[params.from]

  return { feeCredits: feeCredits.toString() }
}
