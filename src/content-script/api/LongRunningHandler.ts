import { EventData } from '../../types/EventData'
import { APIHandler } from './APIHandler'

// Callback the job executor passes into a long-running handler so it can report
// progress. The executor persists each reported stage (e.g. via JobsRepository)
// so the popup can render it and it survives the popup closing.
export interface JobProgressContext {
  onProgress: (stage: string) => void | Promise<void>
}

// A handler for an operation that can outlive the popup: asset-lock waits,
// Halo2 proving, state-transition confirmation. Identical to APIHandler except
// `handle` accepts an optional progress context. When it is omitted the handler
// behaves exactly like a plain APIHandler (the synchronous in-popup path, no
// reporting), so the same handler works on both transports.
export interface LongRunningHandler extends APIHandler {
  handle: (event: EventData, ctx?: JobProgressContext) => Promise<any>
}
