import { useCallback, useEffect, useRef, useState } from 'react'
import { CORE_DASH_DECIMALS } from '../../../../utils'
import type { TransferApi } from '../transferApi'
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

// Hook a running transfer uses to report how to resume it.
export interface TransferProgress {
  setResume: (resume: TransferResume) => void
}

export type TransferOperationState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'success', hashes: TransferHashes, fee?: TransferFee }
  | { status: 'failed', error: string, resume: TransferResume | null }

const POLL_INTERVAL_MS = 1000
const MAX_POLL_ERRORS = 3

const errorMessage = (e: unknown): string => e instanceof Error ? e.message : String(e)

// Status of the transfer being sent, from the running call or a polled backend operation.
export function useTransferOperation (api: TransferApi): {
  state: TransferOperationState
  track: (start: (progress: TransferProgress) => Promise<TransferStart>, resume?: TransferResume | null) => void
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

        const statuses = operation.stages.map(stage => stage.status)

        if (statuses.includes('failed')) {
          setState({ status: 'failed', error: operation.error ?? 'The transfer failed', resume })
          return
        }

        if (statuses.length > 0 && statuses.every(status => status === 'done')) {
          const fee = operation.fee != null ? { amount: BigInt(operation.fee), decimals: CORE_DASH_DECIMALS } : undefined
          setState({ status: 'success', hashes: { core: operation.coreTxHash, platform: operation.platformTxHash }, fee })
          return
        }

        next(0)
      })
      .catch(e => {
        if (run !== runRef.current) return
        if (errors + 1 < MAX_POLL_ERRORS) {
          next(errors + 1)
          return
        }
        setState({ status: 'failed', error: errorMessage(e), resume })
      })
  }, [api])

  const track = useCallback((start: (progress: TransferProgress) => Promise<TransferStart>, initialResume?: TransferResume | null): void => {
    stop()
    const run = runRef.current
    let resume = initialResume ?? null
    setState({ status: 'running' })

    start({ setResume: (next) => { resume = next } })
      .then(result => {
        if (run !== runRef.current) return
        if (result.type === 'operation') {
          poll(run, result.operationId, 0)
          return
        }
        setState({ status: 'success', hashes: result.hashes, fee: result.fee })
      })
      .catch(e => {
        if (run !== runRef.current) return
        setState({ status: 'failed', error: errorMessage(e), resume })
      })
  }, [poll, stop])

  const reset = useCallback(() => {
    stop()
    setState({ status: 'idle' })
  }, [stop])

  // Stops polling when the screen goes away.
  useEffect(() => stop, [stop])

  return { state, track, reset }
}
