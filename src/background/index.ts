import { JobsRepository } from '../content-script/repository/JobsRepository'
import { JobExecutor } from '../content-script/api/JobExecutor'
import { ExtensionStorageAdapter } from '../content-script/storage/extensionStorageAdapter'
import { StartJobMessage, StartJobResponse, RunJobMessage } from '../types/jobs'

// Service worker: orchestrates background jobs. It owns no business logic — it
// forwards START_JOB requests to the offscreen document (which runs the actual
// handler via JobExecutor) and reconciles interrupted jobs on restart. It must
// stay light (no SDK / WASM imports) so it starts fast and survives easily.

const OFFSCREEN_URL = 'offscreen.html'

async function ensureOffscreen (): Promise<void> {
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: 'Run long-lived Dash Platform jobs (Halo2 proving, asset-lock waits) off the popup lifecycle'
    })
  } catch (e) {
    // A document already exists (or another call raced us) — that is expected.
    if (!(e instanceof Error) || !/single offscreen/i.test(e.message)) {
      throw e
    }
  }
}

// The offscreen document registers its RUN_JOB listener as soon as it loads, but
// a freshly created document may not be listening yet when we first post. It
// acknowledges receipt with `{ ok: true }`; retry until we get that ack (sending
// alone cannot confirm delivery, since this worker's own listener also receives
// the message).
async function sendToOffscreen (message: RunJobMessage): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await chrome.runtime.sendMessage(message).catch(() => undefined)

    if ((response as { ok?: boolean } | undefined)?.ok === true) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  throw new Error('Offscreen document did not accept the job in time')
}

chrome.runtime.onMessage.addListener((message: StartJobMessage, _sender, sendResponse) => {
  if (message?.target !== 'background' || message.type !== 'START_JOB') {
    return
  }

  const jobId = message.jobId ?? crypto.randomUUID()

  void (async () => {
    await ensureOffscreen()
    await sendToOffscreen({ target: 'offscreen', type: 'RUN_JOB', jobId, method: message.method, payload: message.payload })

    const response: StartJobResponse = { jobId }
    sendResponse(response)
  })().catch((e) => {
    const response: StartJobResponse = { jobId, error: e instanceof Error ? e.message : String(e) }
    sendResponse(response)
  })

  return true // keep the channel open for the async sendResponse
})

// On service-worker (re)start, mark any job left mid-flight (its offscreen
// executor was torn down) as interrupted so the popup can surface a retry.
const reconcile = (): void => {
  const executor = new JobExecutor(new JobsRepository(new ExtensionStorageAdapter()), {})

  executor.reconcileInterrupted().catch(() => {})
}

chrome.runtime.onStartup.addListener(reconcile)
chrome.runtime.onInstalled.addListener(reconcile)
