import { RunJobMessage } from '../types/jobs'

// Offscreen document entry. It hosts the JobExecutor, which loads the Dash
// Platform SDK + Halo2 WASM — heavy, and the whole reason jobs run here instead
// of the ephemeral popup. The executor is built via a dynamic import so WASM
// initialization does not block this script from registering its message
// listener first.

// Buffer RUN_JOB messages that arrive before the (async, WASM-loading) executor
// is ready, then drain them once it is. The listener is registered synchronously
// so a job posted right after the document is created is never dropped.
const pending: RunJobMessage[] = []
let runJob: ((message: RunJobMessage) => void) | null = null

chrome.runtime.onMessage.addListener((message: RunJobMessage, _sender, sendResponse) => {
  if (message?.target !== 'offscreen' || message.type !== 'RUN_JOB') {
    return
  }

  if (runJob != null) {
    runJob(message)
  } else {
    pending.push(message)
  }

  // Acknowledge so the service worker knows the offscreen document received it
  // (delivery cannot be inferred from sendMessage alone — the SW's own listener
  // also receives the message).
  sendResponse({ ok: true })
})

const start = async (): Promise<void> => {
  // eslint-disable-next-line
  // @ts-ignore
  const { createOffscreenRunJob } = await import('./initOffscreenExecutor')

  runJob = await createOffscreenRunJob()

  while (pending.length > 0) {
    runJob(pending.shift() as RunJobMessage)
  }
}

start().catch((e) => console.error('Failed to init offscreen job executor', e))
