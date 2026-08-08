import { ExtensionStorageAdapter } from '../content-script/storage/extensionStorageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { DashCoreSDK } from 'dash-core-sdk'
import { Network } from '../types/enums/Network'
import { JobsRepository } from '../content-script/repository/JobsRepository'
import { JobExecutor } from '../content-script/api/JobExecutor'
import { createJobHandlers } from '../content-script/api/createJobHandlers'
import { RunJobMessage } from '../types/jobs'
import { EventData } from '../types/EventData'

// Builds the JobExecutor (SDK + WASM) and returns a function that runs a single
// RUN_JOB message. Fire-and-forget: the executor persists progress and outcome
// to chrome.storage, so a job survives this document (and the popup) closing.
export async function createOffscreenRunJob (): Promise<(message: RunJobMessage) => void> {
  const storageAdapter = new ExtensionStorageAdapter()
  const network = await storageAdapter.get('network') as string

  const sdk = new DashPlatformSDK({ network: Network[network] })
  const coreSDK = new DashCoreSDK({ network: Network[network] })

  const executor = new JobExecutor(
    new JobsRepository(storageAdapter),
    createJobHandlers(sdk, coreSDK, storageAdapter)
  )

  return (message: RunJobMessage) => {
    const event: EventData = {
      context: 'dash-platform-extension',
      id: message.jobId,
      type: 'request',
      method: message.method,
      payload: message.payload
    }

    void executor.runJob(event)
  }
}
