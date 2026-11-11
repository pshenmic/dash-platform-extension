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
  // 'codec' marks a request a content script wants the backend to decode and
  // hands to the worker, which answers it over the sender's own channel.
  target?: 'offscreen' | 'codec'
}
