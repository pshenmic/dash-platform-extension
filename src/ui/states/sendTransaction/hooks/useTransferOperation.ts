import { useCallback, useEffect, useRef, useState } from 'react'
import type { TransferFee } from './useTransferFee'

export interface TransferHashes {
  single?: string
  core?: string
  platform?: string
}

// What a finished transfer returns; `prepaid` when its Core payment was made earlier.
export interface TransferResult {
  hashes: TransferHashes
  fee?: TransferFee
  prepaid?: boolean
}

// Core payment made earlier that Retry locks into Platform without paying again.
export interface TransferResume {
  address: string
  txid: string
}

export type TransferOperationState =
  | { status: 'idle' }
  | { status: 'running' }
  | ({ status: 'success' } & TransferResult)
  | { status: 'failed', error: string }

const errorMessage = (e: unknown): string => e instanceof Error ? e.message : String(e)

// Status of the transfer being sent.
export function useTransferOperation (): {
  state: TransferOperationState
  track: (start: () => Promise<TransferResult>) => void
  reset: () => void
} {
  const [state, setState] = useState<TransferOperationState>({ status: 'idle' })
  const runRef = useRef(0)

  const track = useCallback((start: () => Promise<TransferResult>): void => {
    const run = ++runRef.current
    setState({ status: 'running' })

    start()
      .then(result => {
        if (run === runRef.current) setState({ status: 'success', ...result })
      })
      .catch(e => {
        if (run === runRef.current) setState({ status: 'failed', error: errorMessage(e) })
      })
  }, [])

  const reset = useCallback(() => {
    runRef.current++
    setState({ status: 'idle' })
  }, [])

  // Ignores a transfer that settles after the screen goes away.
  useEffect(() => () => { runRef.current++ }, [])

  return { state, track, reset }
}
