import { MessagingMethods } from './enums/MessagingMethods'

// Long-running methods that execute as background jobs (in the offscreen
// document, orchestrated by the service worker) instead of synchronously in the
// popup. Fast methods stay on the in-popup dispatch path.
export const JOB_METHODS: string[] = [
  MessagingMethods.SHIELD_TO_POOL
]

export const isJobMethod = (method: string): boolean => JOB_METHODS.includes(method)

// Envelopes over chrome.runtime messaging. `target` routes to the right context
// (the service worker and the offscreen document share one message bus).

// Popup → service worker: start a background job. `jobId` is optional; the
// service worker generates one when absent and returns it.
export interface StartJobMessage {
  target: 'background'
  type: 'START_JOB'
  jobId?: string
  method: string
  payload: unknown
}

export interface StartJobResponse {
  jobId: string
  error?: string
}

// Service worker → offscreen: run the job. The offscreen executor persists
// progress and outcome to storage, so this is fire-and-forget.
export interface RunJobMessage {
  target: 'offscreen'
  type: 'RUN_JOB'
  jobId: string
  method: string
  payload: unknown
}
