import { JobExecutor } from '../../src/content-script/api/JobExecutor'
import { JobsRepository } from '../../src/content-script/repository/JobsRepository'
import { MemoryStorageAdapter } from '../../src/content-script/storage/memoryStorageAdapter'
import { BroadcastError } from '../../src/content-script/errors/BroadcastError'
import { JobStatus } from '../../src/types/enums/JobStatus'
import { EventData } from '../../src/types'

const NETWORK = 'testnet'
const WALLET_ID = 'wallet-under-test'
const STORAGE_KEY = `jobs_${NETWORK}_${WALLET_ID}`

const event = (id: string, method: string, payload: any = {}): EventData => ({
  context: 'dash-platform-extension',
  id,
  method,
  type: 'request',
  payload
})

// Resolves the returned promise from the outside — lets a test hold a handler
// mid-flight (simulating a long asset-lock wait) and release it on demand.
const deferred = (): { promise: Promise<void>, resolve: () => void } => {
  let resolveFn!: () => void
  const promise = new Promise<void>((resolve) => { resolveFn = resolve })
  return { promise, resolve: resolveFn }
}

describe('JobExecutor', () => {
  let storage: MemoryStorageAdapter
  let jobsRepository: JobsRepository

  beforeEach(async () => {
    storage = new MemoryStorageAdapter()
    await storage.remove(STORAGE_KEY)
    await storage.set('network', NETWORK)
    await storage.set('currentWalletId', WALLET_ID)

    jobsRepository = new JobsRepository(storage)
  })

  test('runs a handler to success and records the result', async () => {
    const handler = {
      validatePayload: jest.fn(() => null),
      handle: jest.fn(async () => ({ identifier: 'abc' }))
    }

    const executor = new JobExecutor(jobsRepository, { REGISTER_IDENTITY: handler })
    await executor.runJob(event('job-1', 'REGISTER_IDENTITY'))

    const job = await jobsRepository.getById('job-1')
    expect(job?.status).toBe(JobStatus.succeeded)
    expect(job?.result).toEqual({ identifier: 'abc' })
    expect(job?.error).toBeNull()
  })

  test('streams handler progress stages into the job record', async () => {
    const setStageSpy = jest.spyOn(jobsRepository, 'setStage')

    const handler = {
      validatePayload: jest.fn(() => null),
      handle: jest.fn(async (_event: EventData, ctx?: any) => {
        await ctx.onProgress('building-asset-lock')
        await ctx.onProgress('waiting-asset-lock-proof')
        return { ok: true }
      })
    }

    const executor = new JobExecutor(jobsRepository, { REGISTER_IDENTITY: handler })
    await executor.runJob(event('job-1', 'REGISTER_IDENTITY'))

    expect(setStageSpy.mock.calls.map((call) => call[1])).toEqual([
      'building-asset-lock',
      'waiting-asset-lock-proof'
    ])
  })

  test('completes and persists the outcome even after the popup is gone', async () => {
    const gate = deferred()
    const reachedWait = deferred()

    const handler = {
      validatePayload: jest.fn(() => null),
      handle: jest.fn(async (_event: EventData, ctx?: any) => {
        await ctx.onProgress('waiting-asset-lock-proof')
        reachedWait.resolve()
        // Long asset-lock wait — nothing is listening on the client side.
        await gate.promise
        return { identifier: 'abc' }
      })
    }

    const executor = new JobExecutor(jobsRepository, { REGISTER_IDENTITY: handler })

    // Kick off the job but do NOT await it — the popup would have posted this and
    // could close at any moment.
    const running = executor.runJob(event('job-1', 'REGISTER_IDENTITY'))

    // Once the handler has parked on the long wait, the state is readable from
    // storage via a brand-new repository instance (i.e. a reopened popup / a
    // different context), not from memory.
    await reachedWait.promise
    const midJob = await new JobsRepository(storage).getById('job-1')
    expect(midJob?.status).toBe(JobStatus.running)
    expect(midJob?.stage).toBe('waiting-asset-lock-proof')

    // The long wait finishes while the original caller is gone.
    gate.resolve()
    await running

    const finalJob = await new JobsRepository(storage).getById('job-1')
    expect(finalJob?.status).toBe(JobStatus.succeeded)
    expect(finalJob?.result).toEqual({ identifier: 'abc' })
  })

  test('records a plain handler error as a failed job without rejecting', async () => {
    const handler = {
      validatePayload: jest.fn(() => null),
      handle: jest.fn(async () => { throw new Error('platform rejected transition') })
    }

    const executor = new JobExecutor(jobsRepository, { REGISTER_IDENTITY: handler })
    await expect(executor.runJob(event('job-1', 'REGISTER_IDENTITY'))).resolves.toBeUndefined()

    const job = await jobsRepository.getById('job-1')
    expect(job?.status).toBe(JobStatus.failed)
    expect(job?.error).toEqual({ message: 'platform rejected transition' })
    expect(job?.result).toBeNull()
  })

  test('preserves signedHex from a BroadcastError so the popup can re-broadcast', async () => {
    const handler = {
      validatePayload: jest.fn(() => null),
      handle: jest.fn(async () => { throw new BroadcastError('Broadcast failed', 'deadbeef') })
    }

    const executor = new JobExecutor(jobsRepository, { SEND_PLATFORM_TRANSFER: handler })
    await executor.runJob(event('job-1', 'SEND_PLATFORM_TRANSFER'))

    const job = await jobsRepository.getById('job-1')
    expect(job?.status).toBe(JobStatus.failed)
    expect(job?.error).toEqual({ message: 'Broadcast failed', signedHex: 'deadbeef' })
  })

  test('fails the job when no handler is registered for the method', async () => {
    const executor = new JobExecutor(jobsRepository, {})
    await executor.runJob(event('job-1', 'UNKNOWN_METHOD'))

    const job = await jobsRepository.getById('job-1')
    expect(job?.status).toBe(JobStatus.failed)
    expect(job?.error?.message).toBe('Could not find handler for method UNKNOWN_METHOD')
  })

  test('fails the job on invalid payload without running the handler', async () => {
    const handler = {
      validatePayload: jest.fn(() => 'amount is required'),
      handle: jest.fn(async () => ({}))
    }

    const executor = new JobExecutor(jobsRepository, { SEND_PLATFORM_TRANSFER: handler })
    await executor.runJob(event('job-1', 'SEND_PLATFORM_TRANSFER'))

    expect(handler.handle).not.toHaveBeenCalled()
    const job = await jobsRepository.getById('job-1')
    expect(job?.status).toBe(JobStatus.failed)
    expect(job?.error?.message).toBe('Invalid payload: amount is required')
  })

  test('marks in-flight jobs interrupted on restart, leaving terminal jobs intact', async () => {
    await jobsRepository.create('pending-job', 'REGISTER_IDENTITY')

    await jobsRepository.create('running-job', 'SHIELD_TO_POOL')
    await jobsRepository.setStage('running-job', 'proving')

    await jobsRepository.create('done-job', 'TOP_UP_IDENTITY')
    await jobsRepository.markSucceeded('done-job', { ok: true })

    const executor = new JobExecutor(jobsRepository, {})
    await executor.reconcileInterrupted()

    expect((await jobsRepository.getById('pending-job'))?.status).toBe(JobStatus.interrupted)
    expect((await jobsRepository.getById('running-job'))?.status).toBe(JobStatus.interrupted)
    // Terminal jobs are untouched.
    expect((await jobsRepository.getById('done-job'))?.status).toBe(JobStatus.succeeded)
  })
})
