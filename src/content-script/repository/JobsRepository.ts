import { StorageAdapter } from '../storage/storageAdapter'
import { JobStoreSchema, JobsStoreSchema } from '../storage/storageSchema'
import { JobStatus } from '../../types/enums/JobStatus'

// Pure storage for background job records. No orchestration, no network — the
// service worker / offscreen executor owns the flow and calls into here only to
// persist state transitions of a job.
export class JobsRepository {
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  async create (id: string, method: string): Promise<JobStoreSchema> {
    const storageKey = await this.getStorageKey()
    const jobs = (await this.storageAdapter.get(storageKey) ?? {}) as JobsStoreSchema

    if (jobs[id] != null) {
      throw new Error(`Job with id ${id} already exists`)
    }

    const now = Date.now()

    const job: JobStoreSchema = {
      id,
      method,
      status: JobStatus.pending,
      stage: null,
      result: null,
      error: null,
      createdAt: now,
      updatedAt: now
    }

    jobs[id] = job

    await this.storageAdapter.set(storageKey, jobs)

    return job
  }

  async getById (id: string): Promise<JobStoreSchema | null> {
    const storageKey = await this.getStorageKey()
    const jobs = (await this.storageAdapter.get(storageKey) ?? {}) as JobsStoreSchema

    return jobs[id] ?? null
  }

  async getAll (): Promise<JobStoreSchema[]> {
    const storageKey = await this.getStorageKey()
    const jobs = (await this.storageAdapter.get(storageKey) ?? {}) as JobsStoreSchema

    return Object.values(jobs)
  }

  async setStage (id: string, stage: string): Promise<JobStoreSchema> {
    return await this.patch(id, { status: JobStatus.running, stage })
  }

  async markSucceeded (id: string, result: unknown): Promise<JobStoreSchema> {
    return await this.patch(id, { status: JobStatus.succeeded, result })
  }

  async markFailed (id: string, error: { message: string, signedHex?: string }): Promise<JobStoreSchema> {
    return await this.patch(id, { status: JobStatus.failed, error })
  }

  async markInterrupted (id: string): Promise<JobStoreSchema> {
    return await this.patch(id, { status: JobStatus.interrupted })
  }

  async remove (id: string): Promise<void> {
    const storageKey = await this.getStorageKey()
    const jobs = (await this.storageAdapter.get(storageKey) ?? {}) as JobsStoreSchema

    if (jobs[id] == null) {
      return
    }

    const { [id]: _removed, ...rest } = jobs

    await this.storageAdapter.set(storageKey, rest)
  }

  private async patch (id: string, changes: Partial<JobStoreSchema>): Promise<JobStoreSchema> {
    const storageKey = await this.getStorageKey()
    const jobs = (await this.storageAdapter.get(storageKey) ?? {}) as JobsStoreSchema

    const job = jobs[id]

    if (job == null) {
      throw new Error(`Job with id ${id} does not exist`)
    }

    const updated: JobStoreSchema = { ...job, ...changes, updatedAt: Date.now() }

    jobs[id] = updated

    await this.storageAdapter.set(storageKey, jobs)

    return updated
  }

  private async getStorageKey (): Promise<string> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    return `jobs_${network}_${walletId}`
  }
}
