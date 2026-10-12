import { CORE_FEE_PER_BYTE, CORE_P2PKH_INPUT_BYTES, CORE_P2PKH_OUTPUT_BYTES, CORE_TX_OVERHEAD_BYTES, TRANSFER_FEE_CREDITS } from '../../../../constants'
import type { AddressAmount, TransferOperation, TransferOperationType, TransferStageStatus } from '../types'

// Dev toggles: fail an operation at the given stage, reject the given password.
export const transferMockSettings: { failAtStage: number | null, rejectedPassword: string } = {
  failAtStage: null,
  rejectedPassword: 'wrong'
}

const CORE_STAGE_DURATIONS_MS = [1500, 6000, 3000]

const HEX = '0123456789abcdef'

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

const txFee = (inputs: number, outputs: number): bigint => {
  const bytes = CORE_TX_OVERHEAD_BYTES + inputs * CORE_P2PKH_INPUT_BYTES + outputs * CORE_P2PKH_OUTPUT_BYTES
  return BigInt(bytes) * CORE_FEE_PER_BYTE
}

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

const startOperation = (type: TransferOperationType): { operationId: string } => {
  const fee = txFee(1, 2)

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

// MOCK: Advanced Core -> Core: several outputs and a change address.
export const sendCoreTransaction = async (params: {
  outputs: AddressAmount[]
  changeAddress?: string
}, password: string): Promise<{ txid: string, fee: string }> => {
  await delay(800, 1500)
  assertPassword(password)
  return { txid: randomHash(), fee: txFee(1, Math.max(params.outputs.length, 1) + 1).toString() }
}

// MOCK: Core -> Shielded.
export const shieldFromCore = async (amountDuffs: string, password: string, toShieldedAddress?: string): Promise<{ operationId: string }> => {
  await delay(500, 900)
  assertPassword(password)
  return startOperation('shieldFromCore')
}

// MOCK: status of a Core -> Shielded operation.
export const getTransferOperation = async (operationId: string): Promise<TransferOperation> => {
  await delay(100, 300)
  return snapshotOperation(operationId, getOperation(operationId))
}

// MOCK: continues a failed Core -> Shielded operation without a new asset lock.
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

// MOCK: Advanced Address -> Address: several outputs.
export const sendPlatformTransfer = async (params: {
  inputs: AddressAmount[]
  outputs: AddressAmount[]
}, password: string): Promise<{ stHash: string, feeCredits: string }> => {
  await delay(800, 1500)
  assertPassword(password)
  return { stHash: randomHash(), feeCredits: TRANSFER_FEE_CREDITS.toString() }
}
