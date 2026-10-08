import { useCallback, useEffect, useRef, useState } from 'react'
import { CORE_DASH_DECIMALS } from '../../../../utils'
import type { TransferApi } from '../transferApi'
import type { TransferStageStatus } from '../types'
import type { TransferFee } from './useTransferFee'

export interface TransferHashes {
  single?: string
  core?: string
  platform?: string
}

// What a started transfer returns: a finished transaction or a backend operation to follow.
export type TransferStart =
  | { type: 'done', hashes: TransferHashes, fee?: TransferFee }
  | { type: 'operation', operationId: string }

// What Retry needs to continue a failed transfer without paying again.
export type TransferResume =
  | { type: 'operation', operationId: string }
  | { type: 'funding', address: string, txid: string }

// Hooks a running transfer uses to report its stage and how to resume it.
export interface TransferProgress {
  setStage: (index: number) => void
  setResume: (resume: TransferResume) => void
}

export interface ResumedTransfer {
  resume: TransferResume
  stages: TransferStageStatus[]
}

export type TransferOperationState =
  | { status: 'idle' }
  | { status: 'running', stages: TransferStageStatus[] }
  | { status: 'success', stages: TransferStageStatus[], hashes: TransferHashes, fee?: TransferFee }
  | { status: 'failed', stages: TransferStageStatus[], error: string, resume: TransferResume | null }

const POLL_INTERVAL_MS = 1000
const MAX_POLL_ERRORS = 3

const errorMessage = (e: unknown): string => e instanceof Error ? e.message : String(e)

// Stage statuses with every stage before `index` done and `index` in the given status.
const stagesAt = (count: number, index: number, status: TransferStageStatus): TransferStageStatus[] =>
  Array.from({ length: Math.max(count, 1) }, (_, i): TransferStageStatus => i < index ? 'done' : i === index ? status : 'pending')

// Progress of the transfer being sent, from the running call or a polled backend operation.
export function useTransferOperation (api: TransferApi, stageCount: number): {
  state: TransferOperationState
  track: (start: (progress: TransferProgress) => Promise<TransferStart>, resumed?: ResumedTransfer) => void
  reset: () => void
} {
  const [state, setState] = useState<TransferOperationState>({ status: 'idle' })
  const runRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback((): void => {
    runRef.current++
    if (timerRef.current != null) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const poll = useCallback((run: number, operationId: string, errors: number): void => {
    const resume: TransferResume = { type: 'operation', operationId }
    const next = (failures: number): void => { timerRef.current = setTimeout(() => poll(run, operationId, failures), POLL_INTERVAL_MS) }

    api.getTransferOperation(operationId)
      .then(operation => {
        if (run !== runRef.current) return

        const stages = operation.stages.map(stage => stage.status)

        if (stages.includes('failed')) {
          setState({ status: 'failed', stages, error: operation.error ?? 'The transfer failed', resume })
          return
        }

        if (stages.length > 0 && stages.every(status => status === 'done')) {
          const fee = operation.fee != null ? { amount: BigInt(operation.fee), decimals: CORE_DASH_DECIMALS } : undefined
          setState({ status: 'success', stages, hashes: { core: operation.coreTxHash, platform: operation.platformTxHash }, fee })
          return
        }

        setState({ status: 'running', stages })
        next(0)
      })
      .catch(e => {
        if (run !== runRef.current) return
        if (errors + 1 < MAX_POLL_ERRORS) {
          next(errors + 1)
          return
        }
        setState(previous => ({ status: 'failed', stages: 'stages' in previous ? previous.stages : stagesAt(stageCount, 0, 'failed'), error: errorMessage(e), resume }))
      })
  }, [api, stageCount])

  const track = useCallback((start: (progress: TransferProgress) => Promise<TransferStart>, resumed?: ResumedTransfer): void => {
    stop()
    const run = runRef.current
    let stage = 0
    let resume = resumed?.resume ?? null
    setState({ status: 'running', stages: resumed?.stages ?? stagesAt(stageCount, 0, 'active') })

    const progress: TransferProgress = {
      setStage: (index) => {
        stage = index
        if (run === runRef.current) setState({ status: 'running', stages: stagesAt(stageCount, index, 'active') })
      },
      setResume: (next) => { resume = next }
    }

    start(progress)
      .then(result => {
        if (run !== runRef.current) return
        if (result.type === 'operation') {
          poll(run, result.operationId, 0)
          return
        }
        setState({ status: 'success', stages: stagesAt(stageCount, stageCount, 'done'), hashes: result.hashes, fee: result.fee })
      })
      .catch(e => {
        if (run !== runRef.current) return
        setState({ status: 'failed', stages: stagesAt(stageCount, stage, 'failed'), error: errorMessage(e), resume })
      })
  }, [stageCount, poll, stop])

  const reset = useCallback(() => {
    stop()
    setState({ status: 'idle' })
  }, [stop])

  // Stops polling when the screen goes away.
  useEffect(() => stop, [stop])

  return { state, track, reset }
}
