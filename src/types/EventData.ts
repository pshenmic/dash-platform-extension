export interface EventData {
  id: string
  // always dash-platform-extension
  context: string
  method: string
  payload?: any
  error?: any
  type: 'request' | 'response' | 'event'
  // Set by the service worker when forwarding a request to the offscreen
  // backend. All extension contexts share one onMessage bus, so without it
  // the worker would receive its own forwarded copy and loop.
  // 'public-api' marks a request a content script handed to the worker to
  // reach the backend on a page's behalf.
  target?: 'offscreen' | 'public-api'
  // The website origin a content script observed for a page request. Only the
  // content script sets it, and only the backend scope reads it — an offscreen
  // document has no page to take an origin from.
  origin?: string
}
