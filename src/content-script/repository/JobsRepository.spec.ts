import { JobsRepository } from './JobsRepository'
import { MemoryStorageAdapter } from '../storage/memoryStorageAdapter'
import { JobStatus } from '../../types/enums/JobStatus'

const NETWORK = 'testnet'
const WALLET_ID = 'wallet-under-test'
const STORAGE_KEY = `jobs_${NETWORK}_${WALLET_ID}`

describe('JobsRepository', () => {
  let storage: MemoryStorageAdapter
  let repository: JobsRepository

  beforeEach(async () => {
    storage = new MemoryStorageAdapter()
    // MemoryStorageAdapter keeps a shared module-level cache; reset the keys this
    // suite touches so tests do not leak state into each other.
    await storage.remove(STORAGE_KEY)
    await storage.set('network', NETWORK)
    await storage.set('currentWalletId', WALLET_ID)

    repository = new JobsRepository(storage)
  })

  it('creates a pending job with timestamps and no stage', async () => {
    const job = await repository.create('job-1', 'REGISTER_IDENTITY')

    expect(job.id).toBe('job-1')
    expect(job.method).toBe('REGISTER_IDENTITY')
    expect(job.status).toBe(JobStatus.pending)
    expect(job.stage).toBeNull()
    expect(job.result).toBeNull()
    expect(job.error).toBeNull()
    expect(job.createdAt).toBeGreaterThan(0)
    expect(job.updatedAt).toBe(job.createdAt)
  })

  it('rejects creating a job with a duplicate id', async () => {
    await repository.create('job-1', 'REGISTER_IDENTITY')

    await expect(repository.create('job-1', 'TOP_UP_IDENTITY'))
      .rejects.toThrow('Job with id job-1 already exists')
  })

  it('returns null for an unknown job', async () => {
    expect(await repository.getById('missing')).toBeNull()
  })

  it('persists the job so it is readable by a fresh repository instance', async () => {
    await repository.create('job-1', 'SHIELD_TO_POOL')

    const reopened = new JobsRepository(storage)
    const job = await reopened.getById('job-1')

    expect(job?.method).toBe('SHIELD_TO_POOL')
    expect(job?.status).toBe(JobStatus.pending)
  })

  it('lists all jobs', async () => {
    await repository.create('job-1', 'REGISTER_IDENTITY')
    await repository.create('job-2', 'SHIELD_TO_POOL')

    const all = await repository.getAll()

    expect(all.map((job) => job.id).sort()).toEqual(['job-1', 'job-2'])
  })

  it('moves a job to running and records the stage', async () => {
    const created = await repository.create('job-1', 'REGISTER_IDENTITY')

    const running = await repository.setStage('job-1', 'waiting-asset-lock-proof')

    expect(running.status).toBe(JobStatus.running)
    expect(running.stage).toBe('waiting-asset-lock-proof')
    expect(running.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)
  })

  it('records a successful result', async () => {
    await repository.create('job-1', 'REGISTER_IDENTITY')

    const succeeded = await repository.markSucceeded('job-1', { identifier: 'abc' })

    expect(succeeded.status).toBe(JobStatus.succeeded)
    expect(succeeded.result).toEqual({ identifier: 'abc' })
    expect(succeeded.error).toBeNull()
  })

  it('records a failure and preserves signedHex for re-broadcast', async () => {
    await repository.create('job-1', 'SEND_PLATFORM_TRANSFER')

    const failed = await repository.markFailed('job-1', {
      message: 'Broadcast failed',
      signedHex: 'deadbeef'
    })

    expect(failed.status).toBe(JobStatus.failed)
    expect(failed.error).toEqual({ message: 'Broadcast failed', signedHex: 'deadbeef' })
  })

  it('marks a job interrupted when its executor is torn down', async () => {
    await repository.create('job-1', 'SHIELD_TO_POOL')
    await repository.setStage('job-1', 'proving')

    const interrupted = await repository.markInterrupted('job-1')

    expect(interrupted.status).toBe(JobStatus.interrupted)
    // Stage is kept so the popup can tell the user where it stopped.
    expect(interrupted.stage).toBe('proving')
  })

  it('throws when patching a non-existent job', async () => {
    await expect(repository.setStage('missing', 'proving'))
      .rejects.toThrow('Job with id missing does not exist')
  })

  it('removes a job and is idempotent on a missing id', async () => {
    await repository.create('job-1', 'REGISTER_IDENTITY')

    await repository.remove('job-1')
    expect(await repository.getById('job-1')).toBeNull()

    await expect(repository.remove('job-1')).resolves.toBeUndefined()
  })

  it('throws when no wallet is chosen', async () => {
    await storage.remove('currentWalletId')

    await expect(repository.create('job-1', 'REGISTER_IDENTITY'))
      .rejects.toThrow('Wallet is not chosen')
  })
})
