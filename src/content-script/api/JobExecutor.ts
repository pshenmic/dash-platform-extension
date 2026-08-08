import { EventData } from '../../types/EventData'
import { JobsRepository } from '../repository/JobsRepository'
import { LongRunningHandler } from './LongRunningHandler'
import { BroadcastError } from '../errors/BroadcastError'
import { JobStatus } from '../../types/enums/JobStatus'

// Context-agnostic controller for background (long-running) jobs. Given a method
// + payload it creates a job record, runs the matching handler while streaming
// its progress stages into the JobsRepository, and maps the terminal outcome
// (success / failure) back into storage.
//
// It knows nothing about Chrome APIs: the service worker / offscreen entrypoints
// are thin adapters that construct it with real repositories and handlers and
// call runJob(). This keeps the whole job lifecycle — including "survives the
// popup closing" — unit-testable without a browser.
export class JobExecutor {
  jobsRepository: JobsRepository
  handlers: { [method: string]: LongRunningHandler }

  constructor (jobsRepository: JobsRepository, handlers: { [method: string]: LongRunningHandler }) {
    this.jobsRepository = jobsRepository
    this.handlers = handlers
  }

  // Runs a job to completion, persisting progress and outcome. Resolves once the
  // job reaches a terminal state; it never rejects — failures are recorded on the
  // job so a closed popup can read them later. `event.id` is the job id (the
  // popup generates it and watches storage for that id).
  async runJob (event: EventData): Promise<void> {
    const { id, method, payload } = event

    await this.jobsRepository.create(id, method)

    const handler = this.handlers[method]

    if (handler == null) {
      await this.jobsRepository.markFailed(id, { message: `Could not find handler for method ${method}` })
      return
    }

    const validation = handler.validatePayload(payload)

    if (validation != null) {
      await this.jobsRepository.markFailed(id, { message: `Invalid payload: ${validation}` })
      return
    }

    try {
      const result = await handler.handle(event, {
        onProgress: async (stage: string) => {
          await this.jobsRepository.setStage(id, stage)
        }
      })

      await this.jobsRepository.markSucceeded(id, result)
    } catch (e) {
      await this.jobsRepository.markFailed(id, this.toJobError(e))
    }
  }

  // Reconciliation after a service-worker / offscreen restart: any job left in a
  // non-terminal state (pending / running) had its executor torn down mid-flight
  // and cannot resume, so mark it interrupted for the user to retry.
  async reconcileInterrupted (): Promise<void> {
    const jobs = await this.jobsRepository.getAll()

    for (const job of jobs) {
      if (job.status === JobStatus.pending || job.status === JobStatus.running) {
        await this.jobsRepository.markInterrupted(job.id)
      }
    }
  }

  private toJobError (e: unknown): { message: string, signedHex?: string } {
    if (e instanceof BroadcastError) {
      return { message: e.message, signedHex: e.signedHex }
    }

    if (e instanceof Error) {
      return { message: e.message }
    }

    return { message: String(e) }
  }
}
